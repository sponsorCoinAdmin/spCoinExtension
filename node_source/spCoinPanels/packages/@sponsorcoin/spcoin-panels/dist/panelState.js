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
class MeritPanelState {
    constructor() {
        this.state = new Map();
        this.listeners = new Map();
        // Defer notifications to post-commit and coalesce duplicates — same
        // reasoning as panelStore.ts's own version of this.
        this.pending = new Set();
        this.scheduled = false;
        // --- reads --------------------------------------------------
        this.isVisible = (id) => this.state.get(id) ?? false;
        this.getSnapshot = (id) => this.state.get(id) ?? false;
        this.getAll = () => new Map(this.state);
        // --- the single write chokepoint -----------------------------
        this.setVisible = (id, visible) => {
            const prev = this.state.get(id) ?? false;
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
export const meritPanelState = new MeritPanelState();
