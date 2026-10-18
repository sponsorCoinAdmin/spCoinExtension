// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/sponsor/ConnectedSponsorPanel.tsx
//
// docs/meritMigration.txt rows 15 / 20 -- the Sponsor tab, written once: spcoin-panels' SponsorPanelController with the four things the web app and the extension each used to build as React nodes (the recipient avatar, the recipient drop-down, the confirm popup and the
// recipient site link) drawn here. A host passes plain data and functions (SponsorPanelHost): the trading provider, the affiliate fee, a trace sink, how to open a recipient's site, and a hook that gives the confirm popup the host's own state (chain, router,
// the pending approval, the debug advance gate).
'use client';

import React from 'react';
import { usePlatform } from '../platform/platform';
import { SP_COIN_DISPLAY as SP } from '@sponsorcoin/spcoin-common/panels';
import { AccountAvatarWithOpen, RecipientSelectDropDownHosted, SponsorPanelController, type SponsorPanelSlots } from '@sponsorcoin/spcoin-panels';
import { recipientAvatarStyle } from '@sponsorcoin/spcoin-common/styles';
import { ConfirmPopup, noConfirmHost, type StakeConfirmHostState, type TradeHost } from '../trade/tradeHost';

/** The Sponsor tab's host: the same data and functions the Swap tab uses (TradeHost). */
export type SponsorPanelHost = TradeHost;
export type { StakeConfirmHostState };

export default function ConnectedSponsorPanel({ host }: { host?: SponsorPanelHost }) {
  const useConfirmHost = host?.useConfirmHost ?? noConfirmHost;
  const platform = usePlatform();
  const slots = React.useMemo<SponsorPanelSlots>(
    () => ({
      renderRecipientAvatar: (account) => <AccountAvatarWithOpen account={account} mode={SP.RECIPIENT_ACCOUNT} style={recipientAvatarStyle} />,
      onRecipientSiteClick: (href) => {
        if (host?.onRecipientSiteClick) host.onRecipientSiteClick(href);
        else platform.openUrl(href);
      },
      confirmPopup: (popupProps) => <ConfirmPopup popupProps={popupProps} useConfirmHost={useConfirmHost} />,
      recipientDropDown: (collapseKey) => (
        <RecipientSelectDropDownHosted
          panelGateId={SP.STAKED_RECIPIENT_SELECT_DROP_DOWN}
          collapseKey={collapseKey}
          iconSizeClassName="h-[22px] w-[22px]"
          pillHeightClassName="h-[16px]"
          pillFontClassName="text-[11px]"
          chevronSize={12}
          copyIconSize={12}
        />
      ),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [host?.onRecipientSiteClick, useConfirmHost, platform],
  );
  return <SponsorPanelController slots={slots} apiProvider={host?.apiProvider} trace={host?.trace} />;
}
