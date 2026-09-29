import React from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { FEED_TYPE } from '@sponsorcoin/spcoin-common/context';
export interface AssetListSelectPanelProps {
    containerType: SP_COIN_DISPLAY;
    feedType: FEED_TYPE;
    walletChrome?: boolean;
    addressBar?: React.ReactNode;
    listContent?: React.ReactNode;
    manageContent?: React.ReactNode;
}
/**
 * Decides whether to show the ADDRESS_PANEL address bar for this container.
 * ACTIVE_LIST_PANEL: shows when ADDRESS_PANEL is itself visible (the real app
 *   opens ADDRESS_PANEL from the address bar's own search entry, so its
 *   visibility is the source of truth there).
 * Other list containers (SELL/BUY token dropdowns, etc.): always shows unless
 *   this is a manage-view feed (which has no manual-address entry).
 */
export declare function shouldShowAddressBar(containerType: SP_COIN_DISPLAY, feedType: FEED_TYPE, addressPanelVisible: boolean): boolean;
export default function AssetListSelectPanel({ containerType, feedType, walletChrome, addressBar, listContent, manageContent, }: AssetListSelectPanelProps): React.JSX.Element;
