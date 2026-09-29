// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/panelTree/panelTreeOpenSourceStore.ts
//
// 2026-09-18 — moved from the parent app's
// lib/context/exchangeContext/panelTreeOpenSourceStore.ts (panel-tree
// runtime migration). No coupling — content unchanged.
//
// Tracks, per panel, whether its most recent open came from the debug
// panel tree (Test page's Exchange Context inspector) rather than a real
// chevron/button opener.
//
// activeListPanelStore's `fromPanelTree` flag already covers this for the
// feedType-driven ACTIVE_LIST_PANEL lists (REMOTE_TOKEN_LIST, REMOTE_AGENT_
// ACCOUNT_LIST, REMOTE_ACCOUNT_RECIPIENT_LIST, REMOTE_ACCOUNT_SEND_LIST). But
// LOCAL_ACCOUNT_WALLET_LIST's account-management render and NETWORK_LIST
// bypass that store entirely (ActiveListPanel.tsx renders AccountManagementPanel/
// Networks directly, with no feed/onCommit params at all) — this store is the
// equivalent signal for those two, keyed by panel so it can be extended to
// other direct-render panels later without a bespoke store each time.
import { useSyncExternalStore } from 'react';
class PanelTreeOpenSourceStore {
    constructor() {
        this.fromPanelTree = new Map();
        this.listeners = new Set();
        this.mark = (panel, isFromPanelTree) => {
            if (this.fromPanelTree.get(panel) === isFromPanelTree)
                return;
            this.fromPanelTree.set(panel, isFromPanelTree);
            for (const fn of Array.from(this.listeners))
                fn();
        };
        this.isFromPanelTree = (panel) => this.fromPanelTree.get(panel) ?? false;
        this.subscribe = (listener) => {
            this.listeners.add(listener);
            return () => {
                this.listeners.delete(listener);
            };
        };
    }
}
export const panelTreeOpenSourceStore = new PanelTreeOpenSourceStore();
export function usePanelTreeOpenSource(panel) {
    return useSyncExternalStore(panelTreeOpenSourceStore.subscribe, () => panelTreeOpenSourceStore.isFromPanelTree(panel), () => false);
}
