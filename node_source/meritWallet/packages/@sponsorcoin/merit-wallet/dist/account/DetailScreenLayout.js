// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/account/DetailScreenLayout.tsx
//
// 2026-11-09 (owner: "a base component to extend, to ensure uniformity"): the ONE layout of every detail screen that has a logo and a table: Account, Agent, Sponsor, Recipient (AccountDetailScreen) and Token and
// Network (MetaDetailScreen). It owns what they share, so a spacing or sizing change is made here once:
//   - the stacked body (ACTIVE_ACCOUNT_BODY: the same gap, the same -mb-[10px] edge);
//   - two independent blocks, each with its own panel flag: the logo block and the meta block (<NAME>_LOGO, <NAME>_META_DATA);
//   - the scalable image (AccountAvatarPanel: same limits, same sizing boundary, the same 18px reserve) and the rounded button box under it, with the meta toggle;
//   - the bottom padding that keeps the buttons whole when the meta block is hidden (the logo block is then the last one) and the body is the active account's, which is pulled up 10px at its edge.
// A screen supplies only what differs: the avatar's own props (the image, the upload button or none, the words of the toggle) and the meta block's content.
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { accountDetailClass, walletPartClass } from '@sponsorcoin/spcoin-common/styles';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { usePanelVisible, useSetPanelVisible } from '@sponsorcoin/spcoin-exchange-engine';
import AccountAvatarPanel from './form/AccountAvatarPanel';
import { RefreshBranch } from '../refresh/refreshReact';
/** 2026-11-09 (owner): the space (px) kept clear around the image inside its box when a screen does not set its own: 20 above, 5 below, 20 left and right. */
export const DEFAULT_IMAGE_BUFFER = { t: 20, b: 5, l: 20, r: 20 };
export default function DetailScreenLayout({ logoFlag, metaFlag, logoId, metaId, avatar, meta, screenId, onSubmit, activeBody = true, resizeKey = '', toggleTrace, tBuffer, bBuffer, rBuffer, lBuffer }) {
    const menuTabHeaderOpen = usePanelVisible(SP_COIN_DISPLAY.MENU_TAB_HEADER_BAR);
    const activeAccountHeaderOpen = usePanelVisible(SP_COIN_DISPLAY.WALLET_RADIO_PANELS);
    const logoVisible = usePanelVisible(logoFlag);
    const metaVisible = usePanelVisible(metaFlag);
    const setPanelVisible = useSetPanelVisible();
    const resizeSignal = [menuTabHeaderOpen, activeAccountHeaderOpen, resizeKey].join(':');
    const body = (_jsxs("div", { id: "ACTIVE_ACCOUNT_BODY", className: walletPartClass.accountBody(activeBody), children: [logoVisible ? (_jsx("div", { id: logoId, className: metaVisible || !activeBody ? accountDetailClass.block : accountDetailClass.blockLast, children: _jsx(AccountAvatarPanel, { panelMarginClass: "mb-0 min-h-0", avatarPanelBorderClass: "", avatarHeading: "", ...avatar, acceptedInput: "image/*", showImage: true, showButton: true, minPreviewSize: 180, overflowMinPreviewSize: 96, maxPreviewSize: 420, minControlWidth: 220, uploadControlTextClassName: walletPartClass.uploadControlText, previewSizeBuffer: 0, previewHeightBuffer: 8, sectionBottomBuffer: activeBody ? 18 : 8, lockSectionHeight: false, fillParentHeight: false, sizingBoundarySelector: "#ACTIVE_ACCOUNT_BODY", resizeSignal: resizeSignal, imageBuffer: { t: tBuffer ?? DEFAULT_IMAGE_BUFFER.t, b: bBuffer ?? DEFAULT_IMAGE_BUFFER.b, r: rBuffer ?? DEFAULT_IMAGE_BUFFER.r, l: lBuffer ?? DEFAULT_IMAGE_BUFFER.l }, toggleOn: metaVisible, onToggle: () => setPanelVisible(metaFlag, !metaVisible, toggleTrace) }) })) : null, metaVisible ? (_jsx("div", { id: metaId, className: accountDetailClass.block, children: meta({ logoVisible }) })) : null] }));
    // the screen is a branch of the refresh tree (named by its logo block: ACCOUNT_LOGO -> ACCOUNT_PANEL); the image and any table inside it are its children
    return (_jsx(RefreshBranch, { id: logoId.replace(/_LOGO$/, '_PANEL'), children: _jsx("div", { id: screenId, className: accountDetailClass.screen, children: onSubmit ? (_jsx("form", { onSubmit: onSubmit, className: accountDetailClass.form, children: body })) : (_jsx("div", { className: accountDetailClass.form, children: body })) }) }));
}
