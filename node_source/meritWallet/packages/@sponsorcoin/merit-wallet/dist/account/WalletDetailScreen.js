// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/account/WalletDetailScreen.tsx
//
// 2026-11-24 (owner: the changes made to the account image panel go to the lowest level so every panel under ASSET_RADIO_PANELS gets them): WALLET_PANEL, the active wallet's account.json, drawn by the SAME shared layout as ACCOUNT_PANEL, TOKEN_PANEL and NETWORK_PANEL (MetaDetailScreen -> DetailScreenLayout -> DetailImageBlock).
// It only supplies the data: the wallet's icon and the rows of its account.json (name, type, website, description, chains, features).
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { getWalletAssetBaseUrl, walletAssetSlug, walletAssetUrl, useWalletAsset } from '@sponsorcoin/spcoin-panels';
import { tokenRowClass } from '@sponsorcoin/spcoin-common/styles';
import MetaDetailScreen from './MetaDetailScreen';
export default function WalletDetailScreen({ walletId, baseUrl = getWalletAssetBaseUrl() }) {
    const slug = walletAssetSlug(walletId ?? '');
    const info = useWalletAsset(slug, baseUrl, undefined);
    if (!slug)
        return _jsx("p", { id: "WALLET_PANEL", children: "No wallet is active." });
    if (!info)
        return _jsxs("p", { id: "WALLET_PANEL", children: ["Reading ", slug, "..."] });
    const rows = [{ label: 'Name', value: info.name }];
    if (info.type)
        rows.push({ label: 'Type', value: `${info.type} wallet` });
    if (info.website)
        rows.push({ label: 'Website', value: _jsx("a", { href: info.website, target: "_blank", rel: "noreferrer", className: tokenRowClass.link, children: info.website }) });
    if (info.description)
        rows.push({ label: 'Description', value: info.description });
    if (info.supportedChains?.length)
        rows.push({ label: 'Supported chains', value: info.supportedChains.join(', ') });
    if (info.features?.length)
        rows.push({ label: 'Features', value: info.features.join(', ') });
    return (_jsx(MetaDetailScreen, { screenId: "WALLET_PANEL", logoFlag: SP_COIN_DISPLAY.WALLET_LOGO, metaFlag: SP_COIN_DISPLAY.WALLET_META_DATA, logoId: "WALLET_LOGO", metaId: "WALLET_META_DATA", logoSrc: walletAssetUrl(slug, info.icon || 'wallet.png', baseUrl), logoAlt: info.name, toggleLabel: "Wallet Meta", imageKind: "wallet", rows: rows }));
}
