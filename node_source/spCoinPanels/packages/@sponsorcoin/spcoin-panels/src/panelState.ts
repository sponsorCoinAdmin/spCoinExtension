// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/panelState.ts
// (moved from node_source/spCoinPanels/engine/, 2026-09-10 — see index.ts's
// own comment for why)
//
// Merit Wallet's own, independent panel-visibility store — genuinely
// separate from the web app's `lib/context/exchangeContext/panelStore.ts`,
// not a delegate to it. Structurally mirrors that file's already-proven
// pattern (plain pub/sub class, no React) since there's nothing wrong
// with the shape, only with where it lived and what it was coupled to —
// see docs/design/extensionPlan.md §7 ("Panel-write architecture
// redesign") for the full reasoning.
//
// 2026-09-21, Path A — RESTORED after being briefly deleted the same day.
// Not dead: `WALLET_NETWORK_HEADER`/`MENU_TAB_HEADER_BAR` were migrated
// onto this engine in the WEB APP itself back on 2026-09-14 (see
// components/views/MeritWallet.tsx's/Headers/WalletNetworkPanel.tsx's own
// import comments, and Branch.tsx's/AgentHeaderContainer.tsx's own
// MERIT_ENGINE_PANEL_IDS patches) — a real, deliberate, pre-Path-A design
// decision this session didn't touch and isn't in scope to unwind. The
// extension's own MeritWallet.tsx (@sponsorcoin/spcoin-panels) no longer
// imports from here (moved onto the real engine, Path A) — the web app's
// own, separate consumers still do, confirmed by direct grep of the whole
// web app repo (not just this package's own folder — the gap that caused
// the brief deletion) before restoring this file.
//
// Single source of truth, single write chokepoint (2026-09-10, on
// request): `setVisible` is the ONLY way this state ever changes — no
// second path exists, by construction, so the "two writers racing"
// bug class documented in the web app's own panelTree history
// (ACCOUNT_PANEL flipping open/closed spontaneously, traced and fixed
// once already) can't recur here. Deliberately simple for the first
// pass — no radio-exclusivity, no ancestor-walking, no stack semantics.
// Add those later, once this is proven working, not before.
//
// Zero dependency on the web app's `@/` alias — only the already-portable
// `SP_COIN_DISPLAY` from the published `@sponsorcoin/spcoin-common/panels`.

import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';

// 2026-09-14, on request (Rewards tab's real table — see
// docs/design/extensionPlan.md's "Fourth slice" entry for the full
// reasoning) — two new, genuinely Merit-only panel ids for
// ManageSponsorshipsPanel.tsx/RewardsPendingByAccountTypePanel.tsx.
// Deliberately plain string literals, NOT new SP_COIN_DISPLAY members:
// unlike this package, `@sponsorcoin/spcoin-common` (where that enum
// lives) isn't dual-vendored into spCoinExtension's own node_source — the
// extension installs it as a real npm package (dist-only, no local src),
// so adding members there would mean an actual publish + dependency bump
// for something with zero reason to ever be visible to the real app. This
// widens PanelId to accept either kind of id in the exact same Map,
// without touching what SP_COIN_DISPLAY itself means anywhere.
//
// 2026-09-21, Path A — MERIT_REWARDS_SUMMARY/MERIT_REWARDS_PENDING
// themselves are RETIRED (see ManageSponsorshipsPanel.tsx/
// RewardsPendingByAccountTypePanel.tsx's own header comments — SUMMARY
// removed outright as redundant, PENDING remapped onto the real
// MANAGE_PENDING_REWARDS id). The `MeritOnlyPanelId` type stays, in case
// a future genuinely-Merit-only concept needs it again, but nothing in
// this package currently uses it.
export type MeritOnlyPanelId = 'MERIT_REWARDS_SUMMARY' | 'MERIT_REWARDS_PENDING';

export type PanelId = SP_COIN_DISPLAY | MeritOnlyPanelId;
export type Listener = () => void;

class MeritPanelState {
  private state = new Map<PanelId, boolean>();
  private listeners = new Map<PanelId, Set<Listener>>();

  // Defer notifications to post-commit and coalesce duplicates — same
  // reasoning as panelStore.ts's own version of this.
  private pending = new Set<PanelId>();
  private scheduled = false;

  // --- reads --------------------------------------------------

  isVisible = (id: PanelId): boolean => this.state.get(id) ?? false;

  getSnapshot = (id: PanelId): boolean => this.state.get(id) ?? false;

  getAll = (): Map<PanelId, boolean> => new Map(this.state);

  // --- the single write chokepoint -----------------------------

  setVisible = (id: PanelId, visible: boolean): void => {
    const prev = this.state.get(id) ?? false;
    if (prev === visible) return;
    this.state.set(id, visible);
    this.queueEmit(id);
  };

  // --- subscribe ------------------------------------------------

  subscribe = (id: PanelId, listener: Listener): (() => void) => {
    let set = this.listeners.get(id);
    if (!set) {
      set = new Set();
      this.listeners.set(id, set);
    }
    set.add(listener);

    return () => {
      set!.delete(listener);
      if (set!.size === 0) this.listeners.delete(id);
    };
  };

  // --- internals --------------------------------------------------

  private queueEmit(id: PanelId) {
    this.pending.add(id);
    if (this.scheduled) return;
    this.scheduled = true;
    setTimeout(() => this.flushNow(), 0);
  }

  private flushNow() {
    this.scheduled = false;
    const toNotify = Array.from(this.pending);
    this.pending.clear();
    for (const pid of toNotify) this.emitNow(pid);
  }

  private emitNow(id: PanelId) {
    const set = this.listeners.get(id);
    if (!set) return;
    for (const fn of Array.from(set)) fn();
  }
}

export const meritPanelState = new MeritPanelState();
