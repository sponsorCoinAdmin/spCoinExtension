// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/usePanelVisible.ts
// (moved from node_source/spCoinPanels/engine/, 2026-09-10 — see index.ts's
// own comment for why)
//
// Merit's own read hook — structurally identical to the web app's
// lib/context/exchangeContext/hooks/usePanelVisible.ts (that pattern was
// already clean; only the source it read from needed to change), bound
// to meritPanelState instead of the app's panelStore.

import { useSyncExternalStore } from 'react';
import { meritPanelState, type PanelId } from './panelState';

/**
 * Subscribe to a single panel's visibility. Component re-renders only
 * when THIS panel changes.
 */
export function usePanelVisible(id: PanelId): boolean {
  return useSyncExternalStore(
    (cb) => meritPanelState.subscribe(id, cb),
    () => meritPanelState.getSnapshot(id),
    // Server snapshot must be deterministic and not depend on browser state.
    () => false,
  );
}
