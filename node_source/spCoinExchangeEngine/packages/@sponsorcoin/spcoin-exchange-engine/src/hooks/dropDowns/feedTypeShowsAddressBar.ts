// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/hooks/dropDowns/feedTypeShowsAddressBar.ts
//
// 2026-09-18 — moved from the parent app's
// lib/utils/feeds/feedTypeShowsAddressBar.ts (panel-tree migration
// follow-up, "stage 9c"). No coupling — content unchanged.
//
// Single source of truth for which ACTIVE_LIST_PANEL list members show the
// "Enter address" bar by default. Add a case here as new list members need
// the bar, instead of a per-opener flag.
//
// Also used as the sync target for SP_COIN_DISPLAY.ADDRESS_PANEL: every real
// opener (useOpenActiveListPanel.openActiveListPanel, plus the LOCAL_ACCOUNT_WALLET_LIST/
// NETWORK_LIST direct openers) writes this feedType's result into ADDRESS_PANEL
// on open, so the debug panel tree's flag always mirrors what's actually on
// screen. Toggling ADDRESS_PANEL directly from the tree then simply overrides
// that value until the next real open resyncs it — tree and GUI never
// disagree either way.

import { FEED_TYPE } from '@sponsorcoin/spcoin-common/context';

export function feedTypeShowsAddressBar(feedType: FEED_TYPE): boolean {
  switch (feedType) {
    case FEED_TYPE.REMOTE_TOKEN_LIST:
    case FEED_TYPE.REMOTE_RECIPIENT_ACCOUNTS:
    case FEED_TYPE.REMOTE_AGENT_ACCOUNTS:
    case FEED_TYPE.REMOTE_ACCOUNT_SEND_LIST: // also Send's "To Recipient" picker (see SendRecipientPanel.tsx)
      return true;
    default:
      return false;
  }
}
