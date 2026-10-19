// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/sponsor/ConnectedSponsorPanel.tsx
//
// docs/meritMigration.txt rows 15 / 20 -- the Sponsor tab, written once: spcoin-panels' SponsorPanelController with the four things the web app and the extension each used to build as React nodes (the recipient avatar, the recipient drop-down, the confirm popup and the
// recipient site link) drawn here. A host passes plain data and functions (SponsorPanelHost): the trading provider, the affiliate fee, a trace sink, how to open a recipient's site, and a hook that gives the confirm popup the host's own state (chain, router,
// the pending approval, the debug advance gate).
'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { walletPartClass } from '@sponsorcoin/spcoin-common/styles';
import React from 'react';
import { usePlatform } from '../platform/platform';
import { SP_COIN_DISPLAY as SP } from '@sponsorcoin/spcoin-common/panels';
import { AccountAvatarWithOpen, RecipientSelectDropDownHosted, SponsorPanelController } from '@sponsorcoin/spcoin-panels';
import { recipientAvatarStyle } from '@sponsorcoin/spcoin-common/styles';
import { ConfirmPopup, noConfirmHost } from '../trade/tradeHost';
export default function ConnectedSponsorPanel({ host }) {
    const useConfirmHost = host?.useConfirmHost ?? noConfirmHost;
    const platform = usePlatform();
    const slots = React.useMemo(() => ({
        renderRecipientAvatar: (account) => _jsx(AccountAvatarWithOpen, { account: account, mode: SP.RECIPIENT_ACCOUNT, style: recipientAvatarStyle }),
        onRecipientSiteClick: (href) => {
            if (host?.onRecipientSiteClick)
                host.onRecipientSiteClick(href);
            else
                platform.openUrl(href);
        },
        confirmPopup: (popupProps) => _jsx(ConfirmPopup, { popupProps: popupProps, useConfirmHost: useConfirmHost }),
        recipientDropDown: (collapseKey) => (_jsx(RecipientSelectDropDownHosted, { panelGateId: SP.STAKED_RECIPIENT_SELECT_DROP_DOWN, collapseKey: collapseKey, iconSizeClassName: walletPartClass.compactPill.iconSize, pillHeightClassName: walletPartClass.compactPill.pillHeight, pillFontClassName: walletPartClass.compactPill.pillFont, chevronSize: walletPartClass.compactPill.chevronSize, copyIconSize: walletPartClass.compactPill.copyIconSize })),
    }), 
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [host?.onRecipientSiteClick, useConfirmHost, platform]);
    return _jsx(SponsorPanelController, { slots: slots, apiProvider: host?.apiProvider, trace: host?.trace });
}
