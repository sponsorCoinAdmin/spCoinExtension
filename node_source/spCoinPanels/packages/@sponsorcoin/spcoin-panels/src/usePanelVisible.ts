// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/usePanelVisible.ts
// (moved from node_source/spCoinPanels/engine/, 2026-09-10 — see index.ts's
// own comment for why)
//
// Merit's own read hook — structurally identical to the web app's
// lib/context/exchangeContext/hooks/usePanelVisible.ts (that pattern was
// already clean; only the source it read from needed to change), bound
// to meritPanelState instead of the app's panelStore.
//
// 2026-09-21, Path A — RESTORED after being briefly deleted the same day;
// see panelState.ts's own header comment for why it's not dead. This
// package's own `PanelGate` (Path A's new real replacement for
// MeritPanelGate) uses the REAL engine's usePanelVisible instead of this
// one — this file stays only for the web app's own remaining real
// consumers of this exact hook (Branch.tsx, AgentHeaderContainer.tsx,
// components/views/MeritWallet.tsx, AccountPanelContent.tsx).

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
