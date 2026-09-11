"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.meritPanelState = void 0;
class MeritPanelState {
    constructor() {
        this.state = new Map();
        this.listeners = new Map();
        // Defer notifications to post-commit and coalesce duplicates — same
        // reasoning as panelStore.ts's own version of this.
        this.pending = new Set();
        this.scheduled = false;
        // --- reads --------------------------------------------------
        this.isVisible = (id) => { var _a; return (_a = this.state.get(id)) !== null && _a !== void 0 ? _a : false; };
        this.getSnapshot = (id) => { var _a; return (_a = this.state.get(id)) !== null && _a !== void 0 ? _a : false; };
        this.getAll = () => new Map(this.state);
        // --- the single write chokepoint -----------------------------
        this.setVisible = (id, visible) => {
            var _a;
            const prev = (_a = this.state.get(id)) !== null && _a !== void 0 ? _a : false;
            if (prev === visible)
                return;
            this.state.set(id, visible);
            this.queueEmit(id);
        };
        // --- subscribe ------------------------------------------------
        this.subscribe = (id, listener) => {
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
    // --- internals --------------------------------------------------
    queueEmit(id) {
        this.pending.add(id);
        if (this.scheduled)
            return;
        this.scheduled = true;
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
        for (const fn of Array.from(set))
            fn();
    }
}
exports.meritPanelState = new MeritPanelState();
