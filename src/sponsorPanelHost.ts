// File: src/sponsorPanelHost.ts
//
// 2026-10-11 (docs/nodeSourceMigrationPlan.txt row 13, task 3): the extension's host for the shared Sponsor panel (spcoin-panels' SponsorPanelController). The controller owns the
// state and the layout; the host supplies only what is its own, the same four slots the web app supplies in components/views/RadioOverlayPanels/SponsorPanel.tsx:
//   recipient avatar   the package's portable AccountAvatar (no panel opens on click here)
//   recipient site     opens the recipient's site in a browser tab (the web app opens a header tab)
//   confirm popup      the package's StakeConfirmPopup; the extension's own approval screen follows when the transaction is signed
//   recipient list     the package's recipient drop-down over the staking row's token pill
import React from 'react';
import { SP_COIN_DISPLAY as SP } from '@sponsorcoin/spcoin-common/panels';
import {
  AccountAvatar,
  ActiveListPanelHost,
  RecipientSelectDropDownHosted,
  SponsorPanelController,
  StakeConfirmPopup,
  type SponsorPanelSlots,
} from '@sponsorcoin/spcoin-panels';
import { HARDHAT_CHAIN_ID } from './chainRpc';

const slots: SponsorPanelSlots = {
  renderRecipientAvatar: (account) =>
    React.createElement(AccountAvatar, { account, mode: SP.RECIPIENT_ACCOUNT, className: 'h-[22px] w-[22px] rounded-lg object-contain' }),
  onRecipientSiteClick: (href) => {
    try {
      void chrome.tabs.create({ url: href });
    } catch {
      window.open(href, '_blank', 'noopener');
    }
  },
  confirmPopup: (popupProps) => React.createElement(StakeConfirmPopup, { ...popupProps, chainId: HARDHAT_CHAIN_ID }),
  recipientDropDown: (collapseKey) =>
    React.createElement(RecipientSelectDropDownHosted, {
      panelGateId: SP.STAKED_RECIPIENT_SELECT_DROP_DOWN,
      collapseKey,
      iconSizeClassName: 'h-[22px] w-[22px]',
      pillHeightClassName: 'h-[16px]',
      pillFontClassName: 'text-[11px]',
      chevronSize: 12,
      copyIconSize: 12,
    }),
};

/** The Sponsor tab for MeritWallet's sponsorPanel prop. No hosted trading provider and no affiliate fee in the extension. */
export function createExtensionSponsorPanel(): React.ReactElement {
  return React.createElement(SponsorPanelController, { slots });
}

/** The lists the shared panels open through the panel tree (pay token, recipient, agent), for MeritWallet's listHost prop; it shows nothing until one is open. */
export function createExtensionListHost(): React.ReactElement {
  return React.createElement(ActiveListPanelHost, { walletChrome: true });
}
