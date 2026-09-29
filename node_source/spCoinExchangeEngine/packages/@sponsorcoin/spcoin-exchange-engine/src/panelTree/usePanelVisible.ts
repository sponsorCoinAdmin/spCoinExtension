// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/panelTree/usePanelVisible.ts
//
// 2026-09-18 — moved from the parent app's
// lib/context/exchangeContext/hooks/usePanelVisible.ts (panel-tree
// runtime migration). No coupling — content unchanged.
'use client';

import { useSyncExternalStore } from 'react';
import { panelStore } from './panelStore';
import type { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';

/**
 * Subscribe to a single panel's visibility.
 * Component re-renders only when THIS panel changes.
 */
export function usePanelVisible(id: SP_COIN_DISPLAY): boolean {
  return useSyncExternalStore(
    (cb) => panelStore.subscribePanel(id, cb),
    () => panelStore.getPanelSnapshot(id),
    // ✅ Server snapshot must be deterministic + not depend on browser state
    () => false,
  );
}
