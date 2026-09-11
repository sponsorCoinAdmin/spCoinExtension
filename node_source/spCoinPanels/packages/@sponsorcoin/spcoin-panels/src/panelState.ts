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

import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';

export type PanelId = SP_COIN_DISPLAY;
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
