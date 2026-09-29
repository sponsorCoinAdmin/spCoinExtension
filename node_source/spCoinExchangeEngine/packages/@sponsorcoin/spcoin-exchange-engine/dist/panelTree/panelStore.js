// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/panelTree/panelStore.ts
//
// 2026-09-18 — moved from the parent app's
// lib/context/exchangeContext/panelStore.ts (panel-tree runtime
// migration). Pure in-memory Map-backed pub-sub, useSyncExternalStore-
// compatible — the only non-trivial dependency was `appendDebugTrace`
// (window.localStorage-backed dev tool), now routed through traceSink.ts
// (injection point #3) instead. Behavior otherwise byte-identical.
import { SP_COIN_DISPLAY, panelName } from '@sponsorcoin/spcoin-common/panels';
import { panelTreeTrace } from './traceSink';
// Always-on: lowest-level write point for EVERY panel-visibility change,
// no matter which caller/hook triggers it (openPanel, showDisplay,
// setPanelVisible, useEnforceRadioPanelGroups's own enforcement effect,
// etc. — all of them funnel through here). Traced only for the handful of
// panels implicated in the "wrong account shown" investigation
// (docs/handoff.md) — a real caller identity (via the stack) is the only
// way to catch a write that ISN'T reachable through any of the
// already-traced call sites (usePanelTree.ts's openPanel/accountMode
// block, etc.), which is exactly what's still unexplained: ACTIVE_ACCOUNT
// flips true again well after the one click that started this, with none
// of those call sites firing again.
const TRACED_IDS = new Set([
    Number(SP_COIN_DISPLAY.ACTIVE_ACCOUNT),
    Number(SP_COIN_DISPLAY.SPONSOR_ACCOUNT),
    Number(SP_COIN_DISPLAY.RECIPIENT_ACCOUNT),
    Number(SP_COIN_DISPLAY.AGENT_ACCOUNT),
    Number(SP_COIN_DISPLAY.ACCOUNT_PANEL),
    Number(SP_COIN_DISPLAY.TRADING_STATION_PANEL),
    // Added once the same symptom (something stale winning the main content
    // area regardless of what was actually clicked) was also reported for
    // NetworkSelectDropDown — opening NETWORK_PANEL apparently doesn't close
    // a still-open ACCOUNT_PANEL either. Tracing NETWORK_PANEL's own writes
    // too settles whether it opens correctly and ACCOUNT_PANEL just never
    // closes (both visible, ACCOUNT_PANEL winning the render), or whether
    // NETWORK_PANEL's own openPanel call isn't even reaching here.
    Number(SP_COIN_DISPLAY.NETWORK_PANEL),
]);
class PanelStore {
    constructor() {
        this.state = new Map();
        this.listeners = new Map();
        // Defer notifications to post-commit and coalesce duplicates
        this.pending = new Set();
        this.scheduled = false;
        // --- reads --------------------------------------------------
        this.isVisible = (id) => this.state.get(id) ?? false;
        // Alias kept for existing callers
        this.getPanelSnapshot = (id) => this.state.get(id) ?? false;
        // Tooling/inspection
        this.getAll = () => new Map(this.state);
        // --- writes -------------------------------------------------
        // `source` — every real caller (openPanel/closePanel via diffAndPublish,
        // setPanelVisible via its own hookName) already computes an invoker/
        // reason string for its own trace; threading that straight through here
        // is both cheaper and more accurate than the stack-parsing this used to
        // do unconditionally.
        //
        // 2026-09-08, same-day verification: confirmed every LIVE call path
        // (openPanel/closePanel -> diffAndPublish, setPanelVisible, and the
        // republish-from-context effect) always supplies a real, non-empty
        // source string — this class's own openPanel/closePanel convenience
        // methods below, the only code that ever called setVisible without one,
        // had zero live callers and were removed. `source` stays optional in the
        // type (a genuinely sourceless call is still handled, just labeled
        // plainly) rather than required, since panelStore is a low-level
        // primitive other future callers may reasonably use without a stack of
        // invoker-string plumbing already in place — but the expensive
        // stack-parsing this used to fall back to unconditionally is gone; an
        // unlabeled write is now cheap to record, not a hidden perf cliff.
        this.setVisible = (id, visible, source) => {
            const prev = this.state.get(id) ?? false;
            if (prev === visible)
                return;
            if (TRACED_IDS.has(Number(id))) {
                panelTreeTrace('panelStore:setVisible', {
                    panel: panelName(Number(id)),
                    prev,
                    next: visible,
                    source: source ?? '(no source passed)',
                });
            }
            this.state.set(id, visible);
            this.queueEmit(id);
        };
        // --- subscribe ---------------------------------------------
        this.subscribePanel = (id, listener) => {
            let set = this.listeners.get(id);
            if (!set) {
                set = new Set();
                this.listeners.set(id, set);
            }
            set.add(listener);
            return () => {
                set.delete(listener);
                if (set.size === 0)
                    this.listeners.delete(id);
            };
        };
    }
    // --- internals ---------------------------------------------
    queueEmit(id) {
        this.pending.add(id);
        if (this.scheduled)
            return;
        this.scheduled = true;
        // Notify after React commit
        setTimeout(() => this.flushNow(), 0);
    }
    flushNow() {
        this.scheduled = false;
        const toNotify = Array.from(this.pending);
        this.pending.clear();
        for (const pid of toNotify)
            this.emitNow(pid);
    }
    emitNow(id) {
        const set = this.listeners.get(id);
        if (!set)
            return;
        // ✅ Copy listeners to avoid mutation issues during emit
        for (const fn of Array.from(set))
            fn();
    }
}
export const panelStore = new PanelStore();
