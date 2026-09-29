// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/AssetListSelectPanel.tsx
// Portable shell for ASSET_LIST_SELECT_PANEL (2026-09-23 migration — see
// docs/panelMigrationStatus.txt). Owns the container layout + showAddressBar
// decision + isManageView routing. The non-portable data resolution
// (useFeedData/useWalletAccountsList — ExchangeContext-bound) and child
// components (AddressSelect/DataListSelect/AccountListRewardsPanel — all
// FSM-coupled via useAssetSelectContext) stay in the web app wrapper and are
// passed in as slots.
//
// The real app's version amalgamates several real feeds (token list, account
// list, agent/recipient/sponsor remote lists — see lib/structure's FEED_TYPE)
// behind one search box. This shell makes the same container structure
// available to any consumer (the extension, future mobile wallet) without
// pulling in the web app's ExchangeContext dependency chain.

'use client';

import React, { useMemo } from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { FEED_TYPE } from '@sponsorcoin/spcoin-common/context';
import { usePanelVisible } from '@sponsorcoin/spcoin-exchange-engine';
import TabBodyMarker from './TabBodyMarker';
import { PACKAGE_BUILD } from './packageBuildTag';

export interface AssetListSelectPanelProps {
  containerType: SP_COIN_DISPLAY;
  feedType: FEED_TYPE;
  walletChrome?: boolean;
  addressBar?: React.ReactNode;
  listContent?: React.ReactNode;
  manageContent?: React.ReactNode;
}

function isManageFeedType(feedType: FEED_TYPE): boolean {
  return feedType === FEED_TYPE.MANAGE_RECIPIENTS || feedType === FEED_TYPE.MANAGE_AGENTS;
}

/**
 * Decides whether to show the ADDRESS_PANEL address bar for this container.
 * ACTIVE_LIST_PANEL: shows when ADDRESS_PANEL is itself visible (the real app
 *   opens ADDRESS_PANEL from the address bar's own search entry, so its
 *   visibility is the source of truth there).
 * Other list containers (SELL/BUY token dropdowns, etc.): always shows unless
 *   this is a manage-view feed (which has no manual-address entry).
 */
export function shouldShowAddressBar(
  containerType: SP_COIN_DISPLAY,
  feedType: FEED_TYPE,
  addressPanelVisible: boolean,
): boolean {
  if (containerType === SP_COIN_DISPLAY.ACTIVE_LIST_PANEL) {
    return addressPanelVisible;
  }
  return !isManageFeedType(feedType);
}

export default function AssetListSelectPanel({
  containerType,
  feedType,
  walletChrome = false,
  addressBar,
  listContent,
  manageContent,
}: AssetListSelectPanelProps) {
  const addressPanelVisible = usePanelVisible(SP_COIN_DISPLAY.ADDRESS_PANEL);
  const isManageView = isManageFeedType(feedType);
  const showAddressBar = useMemo(
    () => shouldShowAddressBar(containerType, feedType, addressPanelVisible),
    [containerType, feedType, addressPanelVisible],
  );

  return (
    <div
      id="AssetListSelectPanel"
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        borderRadius: 15,
        overflow: 'hidden',
        minHeight: 0,
      }}
      data-container-type={containerType}
      data-feed-type={feedType}
    >
      <TabBodyMarker path="AssetListSelectPanel.tsx" build={PACKAGE_BUILD} />
      {showAddressBar && addressBar && (
        <div style={{ paddingLeft: walletChrome ? 3 : 12, paddingRight: walletChrome ? 3 : 12 }}>
          {addressBar}
        </div>
      )}
      {isManageView ? manageContent : listContent}
    </div>
  );
}
