// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/hooks/dropDowns/useOpenActiveListPanel.ts
//
// 2026-09-18 — moved from the parent app's
// lib/context/exchangeContext/hooks/useOpenActiveListPanel.ts (panel-tree
// migration follow-up, "stage 9c"). Previously blocked — stage 7b's own
// note flagged this as depending on "the parent app's own live panel-tree
// store," a 5th real coupling point on top of Phase B.2's original 4.
// Unblocked now that usePanelTree/panelStore are themselves portable
// (stage 9) and FEED_TYPE is unified (this same stage, see
// lib/structure/enums/enums.ts's own comment). No remaining coupling.
'use client';

import { useCallback } from 'react';
import { SP_COIN_DISPLAY, ACTIVE_LIST_PANEL_MODES } from '@sponsorcoin/spcoin-common/panels';
import { usePanelTree } from '../../panelTree/usePanelTree';
import {
  activeListPanelStore,
  type ActiveListPanelParams,
} from './activeListPanelStore';
import { feedTypeShowsAddressBar } from './feedTypeShowsAddressBar';

/**
 * Opens the single, parameterized ACTIVE_LIST_PANEL: stashes the params the
 * panel will read on render, then flips ASSET_LIST_SELECT_PANEL + ACTIVE_LIST_PANEL
 * visible together (same "open container + specific child" pattern used
 * elsewhere in the panel tree).
 *
 * `mode` is an optional child flag to open alongside ACTIVE_LIST_PANEL (e.g.
 * SP_COIN_DISPLAY.REMOTE_TOKEN_LIST) — a purely symbolic, display-only marker. It
 * does not drive any behavior itself — the actual feed/commit/title come
 * from `params`.
 */
export function useOpenActiveListPanel() {
  const { openPanel, closePanel, setPanelVisible, isVisible } = usePanelTree();

  const openActiveListPanel = useCallback(
    (params: ActiveListPanelParams, invoker: string, mode?: SP_COIN_DISPLAY) => {
      activeListPanelStore.set(params);
      // Keep the debug panel tree's ADDRESS_PANEL flag mirroring what's
      // actually about to show — every real opener resyncs it here, so a
      // stale manual toggle from a previous panel/session never leaks in.
      setPanelVisible(
        SP_COIN_DISPLAY.ADDRESS_PANEL,
        feedTypeShowsAddressBar(params.feedType),
        `${invoker}:syncAddressPanel`,
      );
      openPanel(SP_COIN_DISPLAY.ASSET_LIST_SELECT_PANEL, invoker, SP_COIN_DISPLAY.ACTIVE_LIST_PANEL);
      if (mode != null) openPanel(mode, invoker);
    },
    [openPanel, setPanelVisible],
  );

  const closeActiveListPanel = useCallback(
    (invoker: string) => {
      // The content-kind marker (REMOTE_TOKEN_LIST/NETWORK_LIST/etc, set via
      // openActiveListPanel's `mode` param) is never touched by
      // ASSET_LIST_SELECT_PANEL/ACTIVE_LIST_PANEL closing below — it's a
      // separate flag nothing else ever clears. Left stuck true, it lingers
      // as a false "a token/account list is still open" signal forever,
      // which e.g. TokenPanel's tokenListCoversThisPanel gate reads to
      // decide whether it's covered by a nested picker — a stale true here
      // made it render blank on every later open, not just while the list
      // this flag was originally set for was actually still showing.
      const openMode = ACTIVE_LIST_PANEL_MODES.find((mode) => isVisible(mode));
      if (openMode != null) closePanel(openMode, invoker);
      closePanel(SP_COIN_DISPLAY.ACTIVE_LIST_PANEL, invoker);
      closePanel(SP_COIN_DISPLAY.ASSET_LIST_SELECT_PANEL, invoker);
      activeListPanelStore.clear();
    },
    [closePanel, isVisible],
  );

  return { openActiveListPanel, closeActiveListPanel };
}
