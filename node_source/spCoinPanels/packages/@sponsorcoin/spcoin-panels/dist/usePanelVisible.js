"use strict";
// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/usePanelVisible.ts
// (moved from node_source/spCoinPanels/engine/, 2026-09-10 — see index.ts's
// own comment for why)
//
// Merit's own read hook — structurally identical to the web app's
// lib/context/exchangeContext/hooks/usePanelVisible.ts (that pattern was
// already clean; only the source it read from needed to change), bound
// to meritPanelState instead of the app's panelStore.
Object.defineProperty(exports, "__esModule", { value: true });
exports.usePanelVisible = usePanelVisible;
const react_1 = require("react");
const panelState_1 = require("./panelState");
/**
 * Subscribe to a single panel's visibility. Component re-renders only
 * when THIS panel changes.
 */
function usePanelVisible(id) {
    return (0, react_1.useSyncExternalStore)((cb) => panelState_1.meritPanelState.subscribe(id, cb), () => panelState_1.meritPanelState.getSnapshot(id), 
    // Server snapshot must be deterministic and not depend on browser state.
    () => false);
}
