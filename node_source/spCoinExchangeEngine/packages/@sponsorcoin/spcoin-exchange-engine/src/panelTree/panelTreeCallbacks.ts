// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/panelTree/panelTreeCallbacks.ts
//
// 2026-09-18 — moved from the parent app's
// lib/context/exchangeContext/panelTree/panelTreeCallbacks.ts (panel-tree
// runtime migration, injection point #1). The original hard-imported
// `isWalletGateOpen` from the web app's Merit-Wallet-specific
// walletPasswordSession module to redirect any radio-overlay openPanel
// call to PASSWORD_PANEL while the wallet gate is closed. `PanelTreeCallbacksDeps`
// now takes an optional `isGateOpen?: () => boolean`, defaulting to "no
// gate" (always open) when omitted — the web app's usePanelTree.ts wires
// the real isWalletGateOpen in.

'use client';

import { SP_COIN_DISPLAY, PARENT_OF, flattenPersistedPanelTree, ensurePanelPresent, toVisibilityMap, writeFlatTree, type PanelEntry } from '@sponsorcoin/spcoin-common/panels';

import { schedule, logAction } from './panelTreeDebug';
import {
  applyGlobalRadio,
  ensureOneGlobalOverlayVisible,
  restorePrevRadioMember,
  type RadioGroup,
} from './panelTreeRadioController';
import { flags } from './debugFlags';

// Module-level gate-check registration (2026-09-18, injection point #1,
// same shape as traceSink.ts's setPanelTreeTraceSink) — usePanelTree.ts
// calls createPanelTreeCallbacks() internally, with no way for its own
// ~68 zero-argument call sites to thread an isGateOpen through. The web
// app wires the real isWalletGateOpen in once, at boot, via this setter;
// usePanelTree.ts reads it when building its own callbacksDeps. Omit
// entirely for a consumer with no wallet-password-gate concept.
let globalGateCheck: (() => boolean) | undefined;
export function setPanelTreeGateCheck(fn: (() => boolean) | undefined): void {
  globalGateCheck = fn;
}
export function getPanelTreeGateCheck(): (() => boolean) | undefined {
  return globalGateCheck;
}

// Single source of truth for the "kind:panel:invoker" trace-label shape —
// every schedule()/safeDiffAndPublish call site used to hand-build this
// same template literal independently (9 occurrences), with the
// pendingRewards branch's two labels drifting slightly out of sync with
// each other in the process.
const sourceLabel = (
  kind: 'openPanel' | 'closePanel',
  panel: SP_COIN_DISPLAY,
  invoker: string | undefined,
  variant?: 'pendingRewards',
) => `${kind}${variant ? `:${variant}` : ''}:${SP_COIN_DISPLAY[panel]}:${invoker ?? '(none)'}`;

/* ---------------- POP detection ---------------- */
function isPopInvoker(invoker?: unknown) {
  if (typeof invoker !== 'string' || !invoker) return false;
  const s = invoker.trim();
  if (s.startsWith('NAV_CLOSE:')) return true;
  if (s.startsWith('NAV_POP:')) return true;
  if (s.startsWith('HIDE:')) return false;
  return (
    s.includes('closePanel') ||
    s.includes('persist-pop') ||
    s.includes('useOverlayCloseHandler') ||
    s.includes('HeaderController') ||
    s.includes('HeaderX') ||
    s.includes('TradeContainerHeader')
  );
}

/* ---------------- tiny helpers ---------------- */

function setVisible(
  flat: PanelEntry[],
  panel: SP_COIN_DISPLAY,
  visible: boolean,
  withName: (e: PanelEntry) => PanelEntry,
) {
  const n = Number(panel);
  return flat.map((e) =>
    Number(e.panel) === n ? { ...withName(e), visible } : e,
  );
}

// Marks `panel` visible, then walks PARENT_OF up the schema marking every
// ancestor visible too — see PARENT_OF's own comment in panelRegistry.ts for
// why this matters (a leaf being visible with its schema parent stuck at a
// stale value makes anything that walks the tree by visibility, like the
// Test page's panel-tree inspector, show a state the real GUI disagrees with).
function setVisibleWithAncestors(
  flat: PanelEntry[],
  panel: SP_COIN_DISPLAY,
  withName: (e: PanelEntry) => PanelEntry,
) {
  let next = setVisible(flat, panel, true, withName);
  let ancestor = PARENT_OF[panel];
  while (ancestor != null) {
    next = ensurePanelPresent(next, ancestor);
    next = setVisible(next, ancestor, true, withName);
    ancestor = PARENT_OF[ancestor];
  }
  return next;
}

/* ---------------- types ---------------- */

export type SetExchangeContextFn<TState = any> = (
  updater: (prev: TState) => TState,
  hookName?: string,
) => void;

export interface PanelTreeCallbacksDeps {
  known: Set<number>;
  overlays: SP_COIN_DISPLAY[];
  isGlobalOverlay: (p: SP_COIN_DISPLAY) => boolean;
  withName: (e: PanelEntry) => PanelEntry;
  diffAndPublish?: (
    prev: Record<number, boolean>,
    next: Record<number, boolean>,
    source?: string,
  ) => void;
  setExchangeContext: SetExchangeContextFn;
  /**
   * displayStack is real, independently-owned state now (2026-09-06,
   * extracted off ExchangeContext — see displayStackStore.tsx's own
   * header comment), not a field on the `prev` this file's own
   * setExchangeContext updaters receive. closePanel's radio-restore-on-pop
   * logic needs the current stack to decide what to restore; this
   * ref-based accessor replaces the old `prev.apiCoreSyncedMembers.displayStack`
   * read — same synchronous "current value right now" contract
   * usePanelTree.ts's own pushIfStackMember/removeIfStackMember/popTop
   * already relied on before this extraction.
   */
  getDisplayStackIds: () => SP_COIN_DISPLAY[];
  /**
   * Injection point #1 (2026-09-18 panel-tree migration) — replaces the
   * old hard `isWalletGateOpen` import. While the gate is closed, every
   * OTHER MAIN_RADIO_OVERLAY_PANELS open is redirected to PASSWORD_PANEL
   * instead. Omit for a consumer with no wallet-password-gate concept —
   * defaults to "always open" (no redirect).
   */
  isGateOpen?: () => boolean;
}

/* ---------------- factory ---------------- */

export function createPanelTreeCallbacks(deps: PanelTreeCallbacksDeps) {
  const {
    known,
    overlays,
    isGlobalOverlay,
    withName,
    setExchangeContext,
    getDisplayStackIds,
    isGateOpen = () => true,
  } = deps;

  const isPendingRewards = (p: SP_COIN_DISPLAY) =>
    Number(p) === Number(SP_COIN_DISPLAY.MANAGE_PENDING_REWARDS);

  let warned = false;
  const safeDiffAndPublish = (
    prev: Record<number, boolean>,
    next: Record<number, boolean>,
    source?: string,
  ) => {
    const fn = deps.diffAndPublish;
    if (typeof fn === 'function') return fn(prev, next, source);
    // 2026-09-29, real fix — flags.DEBUG_LOG_PANEL_TREE read live at the
    // point of use (was a frozen module-level const before, reading
    // process.env.NEXT_PUBLIC_DEBUG_LOG_PANEL_TREE directly) — see
    // debugFlags.ts's own header comment for why this has to stay live
    // rather than a one-time snapshot.
    if (flags.DEBUG_LOG_PANEL_TREE && !warned) {
      warned = true;
      // eslint-disable-next-line no-console
      console.warn('[panelTreeCallbacks] diffAndPublish missing (noop).');
    }
  };

  const radioGroupsPriority: RadioGroup[] = [
    { name: 'MAIN_RADIO_OVERLAY_PANELS', members: overlays },
  ];

  /* ---------------- open ---------------- */

  const openPanel = (
    panel: SP_COIN_DISPLAY,
    invoker?: string,
    _parent?: SP_COIN_DISPLAY,
  ) => {
    logAction('openPanel', panel, invoker);
    if (!known.has(Number(panel))) return;

    // Pending Rewards: pure visibility toggle (no radio, no stack).
    if (isPendingRewards(panel)) {
      schedule(() => {
        setExchangeContext((prev) => {
          // 2026-09-01: reads displayPanels, not spCoinPanelTree — see
          // DisplayPanel's doc comment in types.ts.
          const flat0 = flattenPersistedPanelTree(
            (prev as any)?.apiCoreSyncedMembers?.displayPanels,
            known,
          );
          const next = setVisibleWithAncestors(
            ensurePanelPresent(flat0, SP_COIN_DISPLAY.MANAGE_PENDING_REWARDS),
            SP_COIN_DISPLAY.MANAGE_PENDING_REWARDS,
            withName,
          );
          safeDiffAndPublish(toVisibilityMap(flat0), toVisibilityMap(next), sourceLabel('openPanel', panel, invoker, 'pendingRewards'));
          return writeFlatTree(prev as any, next) as any;
        });
      }, sourceLabel('openPanel', panel, invoker, 'pendingRewards'));
      return;
    }

    schedule(() => {
      setExchangeContext((prev) => {
        // 2026-09-01: reads displayPanels, not spCoinPanelTree — see
        // DisplayPanel's doc comment in types.ts. writeFlatTree still
        // mirrors both, so this is a read-source swap only.
        const flat0 = flattenPersistedPanelTree(
          (prev as any)?.apiCoreSyncedMembers?.displayPanels,
          known,
        );

        let flat = ensurePanelPresent(flat0, panel);

        if (typeof _parent === 'number' && Number.isFinite(Number(_parent))) {
          flat = ensurePanelPresent(flat, _parent);
          flat = setVisibleWithAncestors(flat, _parent, withName);
        }

        // A leaf opened directly (e.g. Branch.tsx's debug-tree clicks, which
        // open a specific child like REMOTE_TOKEN_LIST rather than its
        // ASSET_LIST_SELECT_PANEL overlay ancestor) still needs the SAME
        // radio exclusivity a direct open of that overlay ancestor would
        // get — otherwise a sibling overlay (e.g. MANAGE_SPONSORSHIPS_PANEL)
        // left visible:true from an earlier navigation is never actually
        // turned off, and resurfaces once this one later closes.
        let overlayAncestor: SP_COIN_DISPLAY | undefined = isGlobalOverlay(panel) ? panel : undefined;
        if (overlayAncestor == null) {
          let cur: SP_COIN_DISPLAY | undefined = PARENT_OF[panel];
          while (cur != null) {
            if (isGlobalOverlay(cur)) {
              overlayAncestor = cur;
              break;
            }
            cur = PARENT_OF[cur];
          }
        }

        // The single Merit Wallet password gate — while it's open, every
        // OTHER MAIN_RADIO_OVERLAY_PANELS open is redirected to
        // PASSWORD_PANEL instead, right here, centrally, at the one choke
        // point every openPanel call already funnels through. Deliberately
        // NOT per-click-handler gating (the wallet's tab bar, account rows,
        // etc.) — radio exclusivity below is atomic/synchronous within one
        // tree write, so whoever calls openPanel last wins *durably*, not
        // just for one render; missing even one entry point would let it
        // durably switch away and stay there. See the plan doc's
        // centralized-guard design. Scoped to radio-member opens only —
        // unrelated page-local popups elsewhere in the app were never
        // MAIN_RADIO_OVERLAY_PANELS members and are untouched.
        if (
          overlayAncestor != null &&
          overlayAncestor !== SP_COIN_DISPLAY.PASSWORD_PANEL &&
          !isGateOpen()
        ) {
          panel = SP_COIN_DISPLAY.PASSWORD_PANEL;
          overlayAncestor = SP_COIN_DISPLAY.PASSWORD_PANEL;
        }

        if (overlayAncestor != null) {
          // Atomically show the overlay ancestor and close all other radio
          // members, then walk panel's own ancestors visible too (radio
          // exclusivity and ancestor visibility are orthogonal concerns).
          const next = setVisibleWithAncestors(
            applyGlobalRadio(flat, overlays, overlayAncestor, withName),
            panel,
            withName,
          );
          safeDiffAndPublish(toVisibilityMap(flat0), toVisibilityMap(next), sourceLabel('openPanel', panel, invoker));
          return writeFlatTree(prev as any, next) as any;
        }

        const next = setVisibleWithAncestors(flat, panel, withName);
        safeDiffAndPublish(toVisibilityMap(flat0), toVisibilityMap(next), sourceLabel('openPanel', panel, invoker));
        return writeFlatTree(prev as any, next) as any;
      });
    }, sourceLabel('openPanel', panel, invoker));
  };

  /* ---------------- close ---------------- */

  const closePanel = (
    panel: SP_COIN_DISPLAY,
    invoker?: string,
    _unused?: unknown,
  ) => {
    logAction('closePanel', panel, invoker);
    if (!known.has(Number(panel))) return;

    // Pending Rewards: pure visibility toggle OFF (no pop/restore).
    if (isPendingRewards(panel)) {
      schedule(() => {
        setExchangeContext((prev) => {
          // 2026-09-01: reads displayPanels, not spCoinPanelTree — see
          // DisplayPanel's doc comment in types.ts.
          const flat0 = flattenPersistedPanelTree(
            (prev as any)?.apiCoreSyncedMembers?.displayPanels,
            known,
          );
          let next = ensurePanelPresent(flat0, SP_COIN_DISPLAY.MANAGE_PENDING_REWARDS);
          next = setVisible(next, SP_COIN_DISPLAY.MANAGE_PENDING_REWARDS, false, withName);
          safeDiffAndPublish(toVisibilityMap(flat0), toVisibilityMap(next), sourceLabel('closePanel', panel, invoker, 'pendingRewards'));
          return writeFlatTree(prev as any, next) as any;
        });
      }, sourceLabel('closePanel', panel, invoker, 'pendingRewards'));
      return;
    }

    schedule(() => {
      setExchangeContext((prev) => {
        // 2026-09-01: reads displayPanels, not spCoinPanelTree — see
        // DisplayPanel's doc comment in types.ts. writeFlatTree still
        // mirrors both, so this is a read-source swap only.
        const flat0 = flattenPersistedPanelTree(
          (prev as any)?.apiCoreSyncedMembers?.displayPanels,
          known,
        );

        const panelToClose = panel;
        const displayStackIds = getDisplayStackIds();
        let next: PanelEntry[] = flat0;

        if (isPopInvoker(invoker)) {
          const restoredResult = restorePrevRadioMember({
            flatIn: flat0,
            displayStack: displayStackIds,
            closing: panelToClose,
            radioGroupsPriority,
            withName,
          });

          // Always-on: this is THE "restore whatever was visible before"
          // mechanism — if ACCOUNT_PANEL keeps reappearing right after some
          // OTHER panel closes, this is the most likely direct cause (not
          // the republish-from-context race investigated so far), and this
          // line proves it directly: shows exactly what got restored and why.
          logAction('closePanel', panelToClose, invoker, {
            restorePrevRadioMember: {
              displayStackIds: displayStackIds.map((id) => SP_COIN_DISPLAY[Number(id) as SP_COIN_DISPLAY]),
              restored:
                restoredResult.restored != null
                  ? SP_COIN_DISPLAY[Number(restoredResult.restored) as SP_COIN_DISPLAY]
                  : null,
            },
          });

          next = restoredResult.nextFlat;

          if (isGlobalOverlay(panelToClose)) {
            if (!restoredResult.restored) {
              // all closed is allowed
            } else if (!flags.ALLOW_EMPTY_GLOBAL_OVERLAY) {
              next = ensureOneGlobalOverlayVisible(
                next,
                overlays,
                SP_COIN_DISPLAY.TRADING_STATION_PANEL,
                withName,
              );
            }
          }
        } else {
          next = flat0.map((e) =>
            e.panel === panelToClose ? { ...withName(e), visible: false } : e,
          );
        }

        safeDiffAndPublish(toVisibilityMap(flat0), toVisibilityMap(next), sourceLabel('closePanel', panelToClose, invoker));
        return writeFlatTree(prev as any, next) as any;
      });
    }, sourceLabel('closePanel', panel, invoker));
  };

  return { openPanel, closePanel };
}
