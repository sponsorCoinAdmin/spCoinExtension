// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/panelTree/usePanelTree.ts
//
// 2026-09-18 — moved from the parent app's
// lib/context/exchangeContext/hooks/usePanelTree.ts (panel-tree runtime
// migration — see the approved plan at .claude/plans/warm-questing-cookie.md).
// Every import is now either an in-package sibling or already-portable
// @sponsorcoin/spcoin-common/panels — see that plan's audit findings for
// the full per-file breakdown. The wallet-gate check (previously a hard
// isWalletGateOpen import inside panelTreeCallbacks.ts) is now read via
// getPanelTreeGateCheck() (injection point #1); the web app wires the
// real check in once at boot via setPanelTreeGateCheck.
'use client';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useExchangeContext } from '../hooks/useExchangeContext';
import { useDisplayStack } from './displayStackStore';
import { SP_COIN_DISPLAY, MAIN_RADIO_OVERLAY_PANELS, CHILDREN, PARENT_OF, 
// ✅ STACK_COMPONENT gate (only these may be pushed/popped)
ACCOUNT_PANEL_MODES, IS_STACK_COMPONENT, flattenPersistedPanelTree, toVisibilityMap, panelName, ensurePanelPresent, writeFlatTree, } from '@sponsorcoin/spcoin-common/panels';
import { panelStore } from './panelStore';
import { useSetPanelVisible, KNOWN } from './useSetPanelVisible';
import { createPanelTreeCallbacks, getPanelTreeGateCheck, } from './panelTreeCallbacks';
// ✅ Use project logger (instead of raw console.log)
import { createDebugLogger } from './debugLogger';
import { panelTreeTrace } from './traceSink';
// 2026-09-29, real fix — every debug/perf flag below used to be a frozen
// module-level const reading process.env.
// NEXT_PUBLIC_* directly; each is now read live from flags.X at its own
// use site instead (removed as module-level consts entirely — this
// hook's own body runs at React render time, safely after any app
// bootstrap's configureDebugFlags() call, so a one-time snapshot taken at
// module-import time would have been stale for the app's own real use,
// not just the extension's) — see debugFlags.ts's own header comment.
import { flags } from './debugFlags';
// usePanelTree() is called from ~68 files, many mounted concurrently as
// part of the panel-tree UI — every one of them reads the exact same
// displayPanels array reference within a given render pass (same
// ExchangeContext value, same commit). Caching the content-stable key
// against that array reference means the first caller in a pass computes
// it and every other caller gets an O(1) lookup instead of independently
// re-running the same map+sort+join. WeakMap so a stale array (from a
// since-superseded context write) doesn't hold a reference forever.
const displayPanelsKeyCache = new WeakMap();
function computeDisplayPanelsKey(displayPanelsRaw) {
    if (!Array.isArray(displayPanelsRaw))
        return '';
    const cached = displayPanelsKeyCache.get(displayPanelsRaw);
    if (cached !== undefined)
        return cached;
    const key = displayPanelsRaw
        .map((e) => `${Number(e?.panel)}:${e?.visible ? 1 : 0}`)
        .sort()
        .join('|');
    displayPanelsKeyCache.set(displayPanelsRaw, key);
    return key;
}
// ✅ Target to diagnose “opens then closes”
const TRACE_TARGET = SP_COIN_DISPLAY.TRADING_STATION_PANEL;
const nameOf = (p) => p == null ? null : panelName(Number(p));
const toNamedStack = (arr) => arr.map((p) => ({ id: Number(p), name: nameOf(p) }));
const diffVisibility = (prev, next) => {
    const changes = [];
    const allIds = new Set([
        ...Object.keys(prev ?? {}).map(Number),
        ...Object.keys(next ?? {}).map(Number),
    ]);
    for (const id of allIds) {
        const a = !!(prev ?? {})[id];
        const b = !!next[id];
        if (a !== b)
            changes.push({ id, name: panelName(id), from: a, to: b });
    }
    return changes;
};
/* ───────────────────────────── DisplayStack helpers (single source of truth) ───────────────────────────── */
const normalizeIds = (arr) => arr
    .map((x) => Number(x))
    .filter((x) => Number.isFinite(x))
    .map((x) => x);
const sameStack = (a, b) => {
    if (a.length !== b.length)
        return false;
    for (let i = 0; i < a.length; i++)
        if (Number(a[i]) !== Number(b[i]))
            return false;
    return true;
};
// Wrapper nodes to SKIP in persisted stack
const NON_INDEXED = new Set([
    Number(SP_COIN_DISPLAY.CONFIG_SLIPPAGE_PANEL),
]);
/**
 * ✅ Persisted stack ids are ALWAYS:
 *   - not NON_INDEXED
 *   - AND members of STACK_COMPONENTS
 */
const toPersistedStackIds = (arr) => normalizeIds(arr).filter((p) => !NON_INDEXED.has(Number(p)) && IS_STACK_COMPONENT.has(Number(p)));
export function usePanelTree() {
    // 2026-09-17 — switched from useWebExchangeContext()'s one-render-lagged
    // mimic back to the real useExchangeContext() directly, per the
    // "ultimately just ExchangeContext" convergence decision
    // (docs/npmMigrationDesign.md). This is the documented Phase-2 "surgical
    // cutover" exchangeContextLibraryDesign.md's mimic mechanism was always
    // rehearsing toward (the 2026-09-05 switch TO the mimic, superseded here,
    // was itself framed as "a step toward" this exact eventual replacement —
    // not a permanent design). Strictly safer than the mimic it replaces: the
    // real context is always synchronously available, removing the
    // transient-null-for-one-render window panelBootstrap.ts used to have to
    // guard against separately (see that file's own updated comment).
    const { exchangeContext, setExchangeContext } = useExchangeContext();
    // Real, independently-owned state (2026-09-06) — displayStack is no
    // longer part of ExchangeContext at all. See displayStackStore.tsx's
    // own header comment for why (a derived value from openPanel/closePanel's
    // own push/pop logic, not independent data two sides need to reconcile
    // directly). setDisplayStackIds/getDisplayStackIds replace the old
    // exchangeContext.apiCoreSyncedMembers.displayStack read/write entirely.
    const { setDisplayStackIds, getDisplayStackIds: getDisplayStackIdsFromStore } = useDisplayStack();
    const debugLog = useMemo(() => createDebugLogger('usePanelTree', flags.DEBUG_LOG_PANEL_ACTIONS || flags.DEBUG_LOG_PANEL_STACK), []);
    const traceRef = useRef(0);
    const nextTraceId = useCallback(() => {
        traceRef.current += 1;
        return traceRef.current;
    }, []);
    const logAction = useCallback((traceId, event, payload) => {
        debugLog.log?.(`[trace:${traceId}] ${event}`, payload ?? '');
    }, [debugLog]);
    // 2026-09-01: reads displayPanels now, not spCoinPanelTree — see
    // DisplayPanel's doc comment in types.ts. spCoinPanelTree is still
    // written (writeFlatTree mirrors both), just no longer read by real
    // engine logic. Both hold identical data at every write, so this is a
    // read-source swap only, not a behavior change.
    //
    // 2026-09-08 (docs/handoff.md's "wrong account"/panel-toggle investigation)
    // — THE root cause of a real, confirmed, reproduced bug: this used to
    // depend on the WHOLE `exchangeContext` object, which gets a brand-new
    // reference on EVERY single write (ExchangeProvider.tsx's setExchangeContext
    // unconditionally clone()s the entire object, every call, regardless of what
    // changed) — so `list`/`visibilityMap` below, and the effect that republishes
    // them into panelStore (a few lines down), were re-running on every totally
    // unrelated context write (a RoleTable fetch resolving, a balance poll
    // succeeding, anything) — not just genuine panel-tree changes. Traced live
    // (panelStore.ts's setVisible caller-stack logging): ACCOUNT_PANEL closing
    // correctly (via openPanel/closePanel's own direct dual-write), then getting
    // reopened moments later by exactly this effect, tied to unrelated
    // RoleTable/balance events interleaving with the close. Fixed by keying off
    // a content-stable snapshot of JUST displayPanels, instead of the raw
    // object reference — this now only recomputes, and only republishes into
    // panelStore, when displayPanels' own content genuinely changes.
    //
    // SAME DAY correction — the first attempt at this key used
    // JSON.stringify(displayPanelsRaw) directly, and it DIDN'T actually fix
    // anything: JSON.stringify is sensitive to object KEY ORDER, and every
    // panel-tree write reconstructs each PanelEntry via a spread
    // (`{...withName(e), visible}` in panelTreeCallbacks.ts) — which can
    // produce a different key order for semantically identical content on
    // every single write. So the "content-stable" key was silently unstable
    // the whole time, and this effect kept re-firing on every render just
    // like before the fix — confirmed live via panelStore.ts's own setVisible
    // trace, which kept showing this exact effect (the publishVisibility
    // call below) re-toggling ACCOUNT_PANEL/ACTIVE_ACCOUNT open→closed→open
    // in a tight loop, undoing a correctly-resolved AGENT_ACCOUNT state
    // moments after it rendered right. Fixed for real this time with a
    // manually-built key: only panel id + visible (the only two fields
    // toVisibilityMap/flattenPanelTree actually read), sorted by id so
    // array-order drift (entries appended/reinserted in a different order
    // across writes, independent of the key-order issue above) can't
    // destabilize it either.
    const displayPanelsRaw = exchangeContext?.apiCoreSyncedMembers?.displayPanels;
    let displayPanelsKey;
    try {
        displayPanelsKey = computeDisplayPanelsKey(displayPanelsRaw);
    }
    catch {
        // Should never happen (displayPanels is plain PanelEntry[] data) —
        // falls back to the reference itself so a genuine change still
        // recomputes, just without the redundant-write suppression this key
        // normally provides.
        displayPanelsKey = String(displayPanelsRaw);
    }
    const list = useMemo(() => {
        return flattenPersistedPanelTree(displayPanelsRaw, KNOWN);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [displayPanelsKey]);
    // ✅ Hydration repair: ensure newly-added panels exist in persisted flat tree
    //
    // Keyed on displayPanelsKey (not the raw exchangeContext reference) for
    // the same reason list/visibilityMap's own effect above is — reading
    // displayPanelsRaw here directly instead of re-deriving it from
    // exchangeContext keeps this effect from re-running on every unrelated
    // context write too.
    useEffect(() => {
        // If there's no persisted tree yet, don't repair here (defaults/boot seeding handles it)
        if (!Array.isArray(displayPanelsRaw))
            return;
        const REQUIRED = [
            SP_COIN_DISPLAY.TOKEN_PANEL,
            SP_COIN_DISPLAY.TOKEN_META_DATA,
            SP_COIN_DISPLAY.TOKEN_LOGO,
            SP_COIN_DISPLAY.ACTIVE_ACCOUNT,
            SP_COIN_DISPLAY.SPONSOR_ACCOUNT,
            SP_COIN_DISPLAY.RECIPIENT_ACCOUNT,
            SP_COIN_DISPLAY.AGENT_ACCOUNT,
            SP_COIN_DISPLAY.ACCOUNT_LOGO,
            SP_COIN_DISPLAY.ACCOUNT_META_DATA,
            SP_COIN_DISPLAY.ASSET_LIST_SELECT_PANEL,
            SP_COIN_DISPLAY.REMOTE_ACCOUNT_RECIPIENT_LIST,
            SP_COIN_DISPLAY.REMOTE_ACCOUNT_SEND_LIST,
            SP_COIN_DISPLAY.LOCAL_ACCOUNT_WALLET_LIST,
            SP_COIN_DISPLAY.NETWORK_LIST,
            SP_COIN_DISPLAY.WALLET_CONFIG_PANEL,
            SP_COIN_DISPLAY.SELL_TOKEN_SELECT_DROP_DOWN,
            SP_COIN_DISPLAY.BUY_TOKEN_SELECT_DROP_DOWN,
            // PROCESS_FLOW removed 2026-09-24 -- retired panel id, see
            // spCoinDisplay.ts's own retirement note.
        ];
        const hasAll = REQUIRED.every((p) => list.some((e) => Number(e.panel) === Number(p)));
        if (hasAll)
            return;
        try {
            setExchangeContext((prev) => {
                const flat0 = flattenPersistedPanelTree(prev?.apiCoreSyncedMembers?.displayPanels, KNOWN);
                let next = flat0;
                for (const p of REQUIRED) {
                    next = ensurePanelPresent(next, p);
                }
                if (next.length === flat0.length)
                    return prev;
                return writeFlatTree(prev, next);
            }, 'usePanelTree:repairPersistedTree');
        }
        catch {
            // eslint-disable-next-line no-console
            console.warn('[usePanelTree] repairPersistedTree failed via direct set; will retry via safe wrapper.');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [displayPanelsKey, list]);
    const visibilityMap = useMemo(() => toVisibilityMap(list), [list]);
    const overlays = useMemo(() => MAIN_RADIO_OVERLAY_PANELS.slice(), []);
    const isGlobalOverlay = useCallback((p) => overlays.includes(p), [
        overlays,
    ]);
    const withName = useCallback((e) => ({ ...e, name: e.name ?? panelName(e.panel) }), []);
    const publishVisibility = useCallback((nextMap, source) => {
        for (const [idStr, v] of Object.entries(nextMap)) {
            panelStore.setVisible(Number(idStr), !!v, source);
        }
    }, []);
    useEffect(() => {
        publishVisibility(visibilityMap, 'usePanelTree:republishFromContext');
    }, [visibilityMap, publishVisibility]);
    // ✅ Reactive radio enforcer: when any radio member becomes visible, close all
    // others — REMOVED (2026-09-08, docs/handoff.md's "wrong account" investigation).
    // This used to be a SECOND, independent copy of exactly the same "whichever
    // member just became visible wins" rule useEnforceRadioPanelGroups.ts already
    // enforces (mounted in RadioOverlayPanelHost.tsx) — but this copy closed losers
    // via setExchangeContext ONLY (context-only, indirect: panelStore only found
    // out once the republish effect above happened to run again later), while
    // useEnforceRadioPanelGroups's setPanelVisible writes panelStore AND context
    // together, synchronously. Two enforcers racing on different write paths for
    // the SAME invariant, at different speeds, is exactly what produced the
    // observed oscillation (ACCOUNT_PANEL flipping open/closed on its own, tied to
    // UNRELATED context writes like a RoleTable fetch or balance poll resolving —
    // traced live via panelStore.ts's setVisible caller-stack logging, which
    // caught both mechanisms writing conflicting values to the same panel within
    // the same interaction). useEnforceRadioPanelGroups already covers this
    // invariant correctly on its own; removed the duplicate rather than trying to
    // make two competing enforcers agree.
    const isVisible = useCallback((panel) => panelStore.isVisible(panel), []);
    const getPanelChildren = useCallback((panel) => CHILDREN?.[panel] ?? [], []);
    const setExchangeContextSafe = useCallback((nextOrUpdater, hookName) => {
        try {
            setExchangeContext(nextOrUpdater, hookName);
        }
        catch {
            if (typeof nextOrUpdater === 'function') {
                setExchangeContext(nextOrUpdater(exchangeContext), hookName);
            }
            else {
                setExchangeContext(nextOrUpdater, hookName);
            }
        }
    }, [setExchangeContext, exchangeContext]);
    // Delegates to the standalone useSetPanelVisible() hook (2026-09-10,
    // extracted so a caller that only needs the bare flip — e.g. TokenLogo's
    // click handler — doesn't have to pull in this whole hook to get it).
    // Byte-identical behavior to the inline version this replaced: same
    // ExchangeContext-only single write chokepoint, same flatten/find/write
    // logic, just relocated so it's independently importable.
    const setPanelVisible = useSetPanelVisible();
    // Real, independently-owned state now (2026-09-06) — no more mimic-lag
    // ref-mirroring dance (the old persistedIdsRef/readPersistedIdsFromContext/
    // sync-effect trio existed only because the previous source was an
    // effect-driven, one-render-lagged mimic of ExchangeContext; a real
    // Context+useState value doesn't need that). getDisplayStackIdsFromStore
    // is already a synchronous ref-based "current value right now" accessor
    // (see displayStackStore.tsx), same contract the old
    // getPersistedDisplayStackIds provided.
    const getPersistedDisplayStackIds = getDisplayStackIdsFromStore;
    const persistDisplayStack = useCallback((nextIds, traceId, reason) => {
        const nextPersistedIds = toPersistedStackIds(nextIds);
        const currentIds = getDisplayStackIdsFromStore();
        if (sameStack(currentIds, nextPersistedIds)) {
            if (traceId != null) {
                logAction(traceId, 'persistDisplayStack skipped (sameStack)', {
                    reason: reason ?? '(none)',
                    current: toNamedStack(currentIds),
                });
            }
            return;
        }
        if (traceId != null) {
            logAction(traceId, 'persistDisplayStack write', {
                reason: reason ?? '(none)',
                next: toNamedStack(nextPersistedIds),
                next_rawIds: nextPersistedIds.map(Number),
            });
        }
        if (flags.DEBUG_LOG_PANEL_STACK) {
            debugLog.log?.('[stack] persistDisplayStack commit', {
                reason: reason ?? '(none)',
                nextPersistedIds_named: toNamedStack(nextPersistedIds),
            });
        }
        setDisplayStackIds(() => nextPersistedIds);
    }, [getDisplayStackIdsFromStore, setDisplayStackIds, logAction, debugLog]);
    const lastVisRef = useRef(null);
    useEffect(() => {
        if (!flags.DEBUG_LOG_PANEL_CLOSE_INVARIANTS_RENDER)
            return;
        const claim = SP_COIN_DISPLAY.ACCOUNT_LIST_REWARDS_PANEL;
        const persistedIds = getPersistedDisplayStackIds();
        // eslint-disable-next-line no-console
        console.log('[PanelTree][render-sync]', {
            claimVisible_map: !!visibilityMap[Number(claim)],
            claimVisible_store: panelStore.isVisible(claim),
            persistedDisplayStackNow: toNamedStack(persistedIds),
        });
    }, [visibilityMap, getPersistedDisplayStackIds]);
    const callbacksDeps = useMemo(() => ({
        known: KNOWN,
        overlays,
        isGlobalOverlay,
        withName,
        // `source` unused now that the panelStore write it labeled is gone
        // (see the comment inside) — kept as `_source` rather than dropped,
        // matching this file's own convention for required-but-unused
        // params (_parent/_unused elsewhere).
        diffAndPublish: (prev, next, _source) => {
            if (flags.DEBUG_LOG_PANEL_ACTIONS) {
                const before = !!(prev ?? lastVisRef.current ?? {})[Number(TRACE_TARGET)];
                const after = !!next[Number(TRACE_TARGET)];
                if (before !== after) {
                    debugLog.log?.('[trace] TRADING_STATION_PANEL visibility flip', {
                        from: before,
                        to: after,
                        id: Number(TRACE_TARGET),
                        name: nameOf(TRACE_TARGET),
                    });
                }
            }
            // Single write chokepoint (2026-09-10, see setPanelVisible's own
            // comment above for the full reasoning) — this used to eagerly
            // call publishVisibility(next, source) here too (openPanel/
            // closePanel's own direct panelStore write, separate from
            // setPanelVisible's); removed for the same reason. The debug
            // tracing below (flags.DEBUG_LOG_PANEL_ACTIONS/flags.DEBUG_LOG_PANEL_CLOSE_INVARIANTS/lastVisRef)
            // is untouched — only the panelStore write itself is gone.
            if (!flags.DEBUG_LOG_PANEL_CLOSE_INVARIANTS) {
                lastVisRef.current = next;
                return;
            }
            const changes = diffVisibility(prev ?? lastVisRef.current, next);
            // eslint-disable-next-line no-console
            console.log('[PanelTree][close-invariants] publishVisibility', {
                visibilityChanges: changes.length ? changes : '(none)',
            });
            lastVisRef.current = next;
        },
        setExchangeContext,
        // Real, independently-owned state now (2026-09-06) — closePanel's
        // radio-restore-on-pop logic needs the current displayStack to decide
        // what to restore, but can no longer read it off `prev` inside its
        // own setExchangeContext updater the way it used to (displayStack
        // isn't part of that object anymore). Passed in as a ref-based
        // accessor instead — same pattern this hook already used for
        // pushIfStackMember/removeIfStackMember/popTop before this
        // extraction. See panelTreeCallbacks.ts's own closePanel comment.
        getDisplayStackIds: getDisplayStackIdsFromStore,
        // Injection point #1 — see panelTreeCallbacks.ts's own
        // getPanelTreeGateCheck comment. Indirected through a stable
        // wrapper (not `getPanelTreeGateCheck()` captured directly) so
        // registration order doesn't matter: AppBootstrap.tsx wires the
        // real check in via a useEffect, which runs AFTER this memo could
        // already have captured `undefined` on first render — reading
        // through the indirection at CALL time instead means a call that
        // happens after boot always sees whatever's currently registered,
        // regardless of when setPanelTreeGateCheck was actually invoked.
        isGateOpen: () => (getPanelTreeGateCheck() ?? (() => true))(),
    }), [
        overlays,
        isGlobalOverlay,
        withName,
        publishVisibility,
        setExchangeContext,
        getDisplayStackIdsFromStore,
        debugLog,
    ]);
    const base = useMemo(() => createPanelTreeCallbacks(callbacksDeps), [callbacksDeps]);
    const baseShow = base.openPanel;
    const baseHide = base.closePanel;
    const tagInvoker = useCallback((kind, invoker) => {
        const s = (invoker ?? '').trim();
        const base = s.length ? s : '(none)';
        return kind === 'NAV_OPEN' ? `NAV_OPEN:${base}` : `NAV_CLOSE:${base}`;
    }, []);
    const tagHideInvoker = useCallback((invoker) => {
        const s = (invoker ?? '').trim();
        const base = s.length ? s : '(none)';
        return `HIDE:${base}`;
    }, []);
    /* ------------------------------ PRIVATE (internal) -------------------------------- */
    // ✅ renamed from showInternal
    const showDisplay = useCallback((panel, invoker, parent) => {
        const traceId = nextTraceId();
        logAction(traceId, 'showDisplay called', {
            panel: { id: Number(panel), name: nameOf(panel) },
            invoker,
            parent: parent == null ? null : { id: Number(parent), name: nameOf(parent) },
            visibleBefore_store: panelStore.isVisible(panel),
        });
        baseShow(panel, invoker, parent);
        return parent ?? null;
    }, [baseShow, nextTraceId, logAction]);
    // ✅ renamed from hideInternal
    const hideDisplay = useCallback((panel, invoker, arg) => {
        const traceId = nextTraceId();
        logAction(traceId, 'hideDisplay called', {
            panel: { id: Number(panel), name: nameOf(panel) },
            invoker,
            visibleBefore_store: panelStore.isVisible(panel),
            arg,
        });
        baseHide(panel, invoker, arg);
    }, [baseHide, nextTraceId, logAction]);
    /* ------------------------------ STACK helpers (internal) -------------------------------- */
    const pushIfStackMember = useCallback((panel, traceId, reason) => {
        const stackBefore = getPersistedDisplayStackIds();
        logAction(traceId, 'stack push check', {
            panel: { id: Number(panel), name: nameOf(panel) },
            isStackComponent: IS_STACK_COMPONENT.has(Number(panel)),
            isNonIndexed: NON_INDEXED.has(Number(panel)),
            stackBefore: toNamedStack(stackBefore),
        });
        if (!IS_STACK_COMPONENT.has(Number(panel)))
            return stackBefore;
        if (NON_INDEXED.has(Number(panel)))
            return stackBefore;
        // If the panel already exists in the stack, navigate to it (trim to that position)
        // rather than pushing a duplicate.  This prevents [WAC → ACCOUNT_PANEL → WAC] growth.
        const numPanel = Number(panel);
        let existingIdx = -1;
        for (let i = stackBefore.length - 1; i >= 0; i--) {
            if (Number(stackBefore[i]) === numPanel) {
                existingIdx = i;
                break;
            }
        }
        const nextStack = existingIdx >= 0
            ? toPersistedStackIds(stackBefore.slice(0, existingIdx + 1))
            : toPersistedStackIds([...stackBefore, panel]);
        persistDisplayStack(nextStack, traceId, existingIdx >= 0 ? `${reason}:navigate-to-existing` : reason);
        if ((flags.DEBUG_LOG_PANEL_TREE || flags.DEBUG_LOG_OVERLAY_CLOSE)) {
            // eslint-disable-next-line no-console
            console.log('[PanelTree] displayStack (push) =', toNamedStack(nextStack));
        }
        return nextStack;
    }, [getPersistedDisplayStackIds, persistDisplayStack, logAction]);
    const removeIfStackMember = useCallback((panel, traceId, reason) => {
        const stackBefore = getPersistedDisplayStackIds();
        logAction(traceId, 'stack remove check', {
            panel: { id: Number(panel), name: nameOf(panel) },
            isStackComponent: IS_STACK_COMPONENT.has(Number(panel)),
            stackBefore: toNamedStack(stackBefore),
        });
        if (!IS_STACK_COMPONENT.has(Number(panel))) {
            return {
                removed: null,
                stackBefore,
                nextStack: stackBefore,
            };
        }
        let idx = -1;
        for (let i = stackBefore.length - 1; i >= 0; i--) {
            if (Number(stackBefore[i]) === Number(panel)) {
                idx = i;
                break;
            }
        }
        if (idx < 0) {
            return {
                removed: null,
                stackBefore,
                nextStack: stackBefore,
            };
        }
        const nextStack = stackBefore.slice(0, idx).concat(stackBefore.slice(idx + 1));
        persistDisplayStack(nextStack, traceId, reason);
        if ((flags.DEBUG_LOG_PANEL_TREE || flags.DEBUG_LOG_OVERLAY_CLOSE)) {
            // eslint-disable-next-line no-console
            console.log('[PanelTree] displayStack (remove) =', toNamedStack(nextStack));
        }
        return { removed: panel, stackBefore, nextStack };
    }, [getPersistedDisplayStackIds, persistDisplayStack, logAction]);
    const popTop = useCallback((traceId, reason) => {
        const stackBefore = getPersistedDisplayStackIds();
        if (!stackBefore.length) {
            return {
                popped: null,
                stackBefore,
                nextStack: stackBefore,
            };
        }
        let idx = stackBefore.length - 1;
        while (idx >= 0 && !IS_STACK_COMPONENT.has(Number(stackBefore[idx])))
            idx--;
        if (idx < 0) {
            persistDisplayStack([], traceId, `${reason}:clear (no stackable items found)`);
            return {
                popped: null,
                stackBefore,
                nextStack: [],
            };
        }
        const popped = stackBefore[idx];
        const nextStack = stackBefore.slice(0, idx);
        persistDisplayStack(nextStack, traceId, reason);
        return { popped, stackBefore, nextStack };
    }, [getPersistedDisplayStackIds, persistDisplayStack]);
    /* ------------------------------ Accounts sync for pending rewards (Option A) ------------------------------ */
    const syncRoleAccountForPending = useCallback((panel, traceId, navInvoker) => {
        // apiCoreSyncedMembers.accounts is the sole SSOT location for accounts
        // (moved off the top level 2026-09-02 — see accountProjection.ts's own
        // doc comment). This used to read the pre-migration `exchangeContext.accounts`
        // shape, which no longer exists — always undefined, so this whole
        // function silently no-op'd (short-circuited at the activeAccount
        // check below) on every call since that move. Found live 2026-09-02
        // via the identical bug in useSelectionCommit.ts's commitRecipient/
        // commitSendRecipient (Send's "To Recipient" picker never landing).
        const accounts = exchangeContext?.apiCoreSyncedMembers?.accounts;
        const activeAccount = accounts?.activeAccount;
        // Only act if we have a valid activeAccount
        if (!activeAccount?.address)
            return;
        let patch = null;
        if (Number(panel) === Number(SP_COIN_DISPLAY.PENDING_SPONSOR_REWARDS)) {
            patch = { sponsorAccount: activeAccount };
        }
        else if (Number(panel) === Number(SP_COIN_DISPLAY.PENDING_RECIPIENT_REWARDS)) {
            patch = { recipientAccount: activeAccount };
        }
        else if (Number(panel) === Number(SP_COIN_DISPLAY.PENDING_AGENT_REWARDS)) {
            patch = { agentAccount: activeAccount };
        }
        else {
            return;
        }
        logAction(traceId, 'syncRoleAccountForPending', {
            panel: { id: Number(panel), name: nameOf(panel) },
            invoker: navInvoker,
            activeAccountPreview: String(activeAccount?.address ?? '').slice(0, 12),
            patchKeys: Object.keys(patch),
        });
        setExchangeContextSafe((prev) => {
            const prevAccounts = prev?.apiCoreSyncedMembers?.accounts ?? {};
            const prevActive = prevAccounts?.activeAccount ?? activeAccount;
            // Skip if already set to same address (avoid extra writes)
            const nextAccounts = { ...prevAccounts, activeAccount: prevActive, ...patch };
            return {
                ...prev,
                apiCoreSyncedMembers: {
                    ...prev.apiCoreSyncedMembers,
                    accounts: nextAccounts,
                },
            };
        }, 'usePanelTree:openPanel:syncRoleAccountForPending');
    }, [exchangeContext, setExchangeContextSafe, logAction]);
    /* ------------------------------ PUBLIC API (single source of truth) -------------------------------- */
    const openPanel = useCallback((panel, invoker, parent) => {
        const traceId = nextTraceId();
        const navInvoker = tagInvoker('NAV_OPEN', invoker);
        logAction(traceId, 'openPanel (public) called', {
            panel: { id: Number(panel), name: nameOf(panel) },
            invoker: navInvoker,
            parent: parent == null ? null : { id: Number(parent), name: nameOf(parent) },
            isStackComponent: IS_STACK_COMPONENT.has(Number(panel)),
            isNonIndexed: NON_INDEXED.has(Number(panel)),
        });
        // ✅ Option A: sync accounts immediately when opening pending rewards panels
        syncRoleAccountForPending(panel, traceId, navInvoker);
        if (Number(panel) === Number(SP_COIN_DISPLAY.ACCOUNT_PANEL)) {
            const hasActiveAccountMode = ACCOUNT_PANEL_MODES.some((mode) => panelStore.isVisible(mode));
            // Always-on: this is the spot that forces ACTIVE_ACCOUNT visible
            // whenever ACCOUNT_PANEL opens directly with no account-mode flag
            // already showing. 2026-09-08 correction: this used to be flagged
            // as "a real suspect for leaking ACTIVE_ACCOUNT true" against
            // useOpenAccountComponent.ts specifically — that caller no longer
            // opens ACCOUNT_PANEL directly at all (it calls openPanel(mode)
            // straight through, for every mode), so this branch no longer
            // races against it. Grepped: no live production call site opens
            // ACCOUNT_PANEL directly anymore either — this is now reachable
            // only via generic/dynamic openPanel(panelId) callers such as the
            // /Test page's own debug-tree click handler (Branch.tsx), not any
            // real user-facing flow. Left in place (still structurally correct
            // for a bare ACCOUNT_PANEL open) and still traced, just no longer
            // a live suspect.
            panelTreeTrace('usePanelTree:openPanel:accountPanelModeCheck', {
                invoker: navInvoker,
                hasActiveAccountMode,
                visibleModes: ACCOUNT_PANEL_MODES.filter((mode) => panelStore.isVisible(mode)).map((mode) => nameOf(mode)),
                willForceActiveAccount: !hasActiveAccountMode,
            });
            if (!hasActiveAccountMode) {
                showDisplay(SP_COIN_DISPLAY.ACTIVE_ACCOUNT, `${navInvoker}:accountPanelDefaultMode`, SP_COIN_DISPLAY.ACCOUNT_PANEL);
            }
        }
        // Always-on: traces every openPanel call targeting one of the 3
        // remaining ACCOUNT_PANEL_MODES roles directly (SPONSOR_ACCOUNT/
        // RECIPIENT_ACCOUNT/ACTIVE_ACCOUNT — AGENT_ACCOUNT has its own
        // dedicated AGENT_PANEL now, see its enum doc comment) — shows
        // exactly which mode(s) get opened, in what order, by whom, each
        // click.
        if (ACCOUNT_PANEL_MODES.some((mode) => Number(mode) === Number(panel))) {
            panelTreeTrace('usePanelTree:openPanel:accountMode', {
                panel: nameOf(panel),
                invoker: navInvoker,
            });
        }
        // A leaf opened directly (e.g. Branch.tsx's debug-tree clicks, which
        // open a specific child like REMOTE_ACCOUNT_AGENT_LIST rather than its
        // stack-component ancestor ASSET_LIST_SELECT_PANEL) still needs THAT
        // ancestor pushed onto displayStack — otherwise a later pop-based
        // close (closePanelCallback's legacy pop-top) pops/restores whatever
        // unrelated entry was already on the stack instead of this list,
        // corrupting the stack. Same root cause as panelTreeCallbacks.ts's
        // radio-ancestor fix, one layer up (the navigation stack, not
        // radio-exclusivity visibility).
        let stackTarget = panel;
        if (!IS_STACK_COMPONENT.has(Number(panel))) {
            let cur = PARENT_OF[panel];
            while (cur != null) {
                if (IS_STACK_COMPONENT.has(Number(cur))) {
                    stackTarget = cur;
                    break;
                }
                cur = PARENT_OF[cur];
            }
        }
        // The AUTO-POP-a-stale-PROCESS_FLOW fix that used to live here
        // (2026-08-28) was removed 2026-09-24 along with PROCESS_FLOW's
        // panel-tree membership entirely (see spCoinDisplay.ts's own
        // retirement note) — the bug it patched (a settled approval-gate
        // panel left stranded on the navigation stack, later wrongly
        // restored by a pop-based close) can no longer occur once that panel
        // is never pushed onto the stack in the first place.
        const stackBefore = getPersistedDisplayStackIds();
        const nextStack = pushIfStackMember(stackTarget, traceId, `openPanel:${navInvoker}`);
        showDisplay(panel, navInvoker, parent);
        if (flags.DEBUG_LOG_PANEL_STACK) {
            const stackAfter = getPersistedDisplayStackIds();
            debugLog.log?.('[stack] openPanel post', {
                panel: { id: Number(panel), name: nameOf(panel) },
                invoker: navInvoker,
                stackBefore: toNamedStack(stackBefore),
                nextStack_fromPush: toNamedStack(nextStack),
                stackAfter_ref: toNamedStack(stackAfter),
            });
        }
    }, [
        nextTraceId,
        tagInvoker,
        logAction,
        syncRoleAccountForPending,
        getPersistedDisplayStackIds,
        pushIfStackMember,
        showDisplay,
        debugLog,
    ]);
    function closePanel(a, b, c) {
        const traceId = nextTraceId();
        const hasPanel = typeof a === 'number' && Number.isFinite(Number(a)) && KNOWN.has(Number(a));
        if (hasPanel) {
            const panel = a;
            const invoker = b;
            const arg = c;
            const navInvoker = tagInvoker('NAV_CLOSE', invoker);
            logAction(traceId, 'closePanel (public) called', {
                panel: { id: Number(panel), name: nameOf(panel) },
                invoker: navInvoker,
                arg,
                isStackComponent: IS_STACK_COMPONENT.has(Number(panel)),
            });
            // NOTE: Do NOT auto-close ASSET_LIST_SELECT_PANEL children.
            // Child modes are stateful and should remain active across parent closes.
            const { nextStack } = removeIfStackMember(panel, traceId, `closePanel:${navInvoker}`);
            const hideInvoker = flags.ALLOW_EMPTY_GLOBAL_OVERLAY && isGlobalOverlay(panel) && nextStack.length === 0
                ? tagHideInvoker(invoker)
                : navInvoker;
            hideDisplay(panel, hideInvoker, arg);
            return;
        }
        const invoker = (typeof a === 'string' ? a : undefined);
        const arg = b;
        const navInvoker = tagInvoker('NAV_CLOSE', invoker ?? 'closePanel:pop-top');
        logAction(traceId, 'closePanel (legacy pop-top) called', {
            invoker: navInvoker,
            arg,
        });
        const { popped, stackBefore, nextStack } = popTop(traceId, `closePanel:${navInvoker}`);
        if (!popped) {
            logAction(traceId, 'closePanel pop-top noop (stack empty)', {
                stackBefore: toNamedStack(stackBefore),
            });
            return;
        }
        logAction(traceId, 'closePanel pop-top will hide popped', {
            popped: { id: Number(popped), name: nameOf(popped) },
            nextStack: toNamedStack(nextStack),
        });
        const hideInvoker = flags.ALLOW_EMPTY_GLOBAL_OVERLAY && isGlobalOverlay(popped) && nextStack.length === 0
            ? tagHideInvoker(invoker)
            : navInvoker;
        hideDisplay(popped, hideInvoker, arg);
        // Restore the panel now on top of the stack.
        const newTop = nextStack.length > 0 ? nextStack[nextStack.length - 1] : null;
        if (newTop != null) {
            logAction(traceId, 'closePanel pop-top restoring new top', {
                newTop: { id: Number(newTop), name: nameOf(newTop) },
            });
            showDisplay(newTop, `${navInvoker}:pop-restore`);
        }
    }
    /* ------------------------------ derived -------------------------------- */
    const activeMainOverlay = useMemo(() => {
        for (const id of overlays)
            if (visibilityMap[id])
                return id;
        return null;
    }, [visibilityMap, overlays]);
    const isTokenScrollVisible = useMemo(() => visibilityMap[SP_COIN_DISPLAY.ASSET_LIST_SELECT_PANEL] ||
        visibilityMap[SP_COIN_DISPLAY.ASSET_LIST_SELECT_PANEL] ||
        visibilityMap[SP_COIN_DISPLAY.ACCOUNT_LIST_REWARDS_PANEL] ||
        visibilityMap[SP_COIN_DISPLAY.TOKEN_PANEL], [visibilityMap]);
    const dumpNavStack = useCallback((tag) => {
        const title = `[PanelTree] displayStack${tag ? ` (${tag})` : ''}`;
        // eslint-disable-next-line no-console
        console.groupCollapsed(title);
        // Real, independently-owned state now (2026-09-06) — there's no more
        // "raw context value" vs "rehydrated" distinction to dump separately;
        // getPersistedDisplayStackIds() is the one real value.
        const persistedIds = getPersistedDisplayStackIds();
        // eslint-disable-next-line no-console
        console.log('[PanelTree] displayStackIds =', persistedIds.map(Number), toNamedStack(persistedIds));
        // eslint-disable-next-line no-console
        console.groupEnd();
    }, [getPersistedDisplayStackIds]);
    // Lets a "reset my children when I'm hidden" effect (e.g. ActiveListPanel's
    // ACTIVE_LIST_PANEL_MODES reset) distinguish a true close from being
    // temporarily covered by a nested stack overlay it's still expected to
    // return to (e.g. ACCOUNT_PANEL opened on top of it) — only the former
    // should actually reset state.
    const isOnDisplayStack = useCallback((panel) => getPersistedDisplayStackIds().some((id) => Number(id) === Number(panel)), [getPersistedDisplayStackIds]);
    // Distinguishes "opened normally, with my list still sitting behind me on
    // the stack" from "a nested picker got pushed on top of me afterward" —
    // the two cases a shared sibling-visibility flag (e.g. REMOTE_TOKEN_LIST)
    // can't tell apart on its own, since it stays true in both. A panel that
    // wants to hide only for the latter case should check this instead of a
    // sibling's raw visibility flag.
    const isTopOfStack = useCallback((panel) => {
        const ids = getPersistedDisplayStackIds();
        if (!ids.length)
            return false;
        return Number(ids[ids.length - 1]) === Number(panel);
    }, [getPersistedDisplayStackIds]);
    return {
        activeMainOverlay,
        isVisible,
        setPanelVisible,
        setVisible: setPanelVisible,
        isTokenScrollVisible,
        getPanelChildren,
        isOnDisplayStack,
        isTopOfStack,
        // ✅ stack-aware navigation API
        openPanel,
        closePanel,
        dumpNavStack,
    };
}
