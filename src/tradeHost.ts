// File: src/sponsorPanelHost.ts
//
// 2026-10-17 (docs/meritMigration.txt rows 15 / 20): the extension's host for the component's trade screens (the Swap tab's trade button and the Sponsor tab) as plain data and functions (the component draws the avatar, the recipient drop-down, the trade button and the confirm popup): how a recipient's site opens (a browser tab) and the
// chain the confirm popup shows. No hosted trading provider and no affiliate fee in the extension.
import type { TradeHost, StakeConfirmHostState } from '@sponsorcoin/merit-wallet';
import { HARDHAT_CHAIN_ID } from './chainRpc';

const confirmHostState: StakeConfirmHostState = { chainId: HARDHAT_CHAIN_ID };

export const extensionTradeHost: TradeHost = {
  onRecipientSiteClick: (href) => {
    try {
      void chrome.tabs.create({ url: href });
    } catch {
      window.open(href, '_blank', 'noopener');
    }
  },
  useConfirmHost: () => confirmHostState,
};
