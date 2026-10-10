// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/TokenSlotPanels.tsx
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt, row 7 / S2b-4b) -- the five token detail panels (Buy, Sell, Buy-Swap, Sell-Swap, Send),
// moved from the web app's components/views/RadioOverlayPanels/{TokenBuyPanel,TokenSellPanel,TokenBuySwapPanel,TokenSellSwapPanel,
// TokenSendPanel}/index.tsx plus TokenSlotDetailPanel.tsx and TokenContractDetailPanel.tsx (all five panels were the only users of those two
// shared bodies). The logic and markup are the web app's, unchanged. What changed is where the inputs come from, so the panels run in any
// host that has an exchange context: the chain id and every token come from the engine's useExchangeContext (the same fields the web
// hooks read), and the record load goes through the host's WalletDataProvider instead of the web app's tokenStore. The web app's
// debug trace calls were dropped on the move (same convention as every earlier move into a package).
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { useExchangeContext, usePanelVisible, defaultMissingImage } from '@sponsorcoin/spcoin-exchange-engine';
import { getTokenMetaData } from '@sponsorcoin/spcoin-panels';
import { ReadOnlyMetaDataTable } from './panels';
import { useWalletData } from './walletData';
// text-sp-sm is a Tailwind token only the web app defines (var(--sp-text-sm), 1rem); an inline style gives every host the same size.
const SP_TEXT_SM = { fontSize: 'var(--sp-text-sm, 1rem)' };
export function CopyBtn({ text }) {
    return (_jsx("button", { type: "button", title: "Copy to clipboard", onClick: () => void navigator.clipboard.writeText(text), className: "shrink-0 text-slate-400 hover:text-white transition-colors", children: _jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", width: "22", height: "22", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("rect", { x: "9", y: "9", width: "13", height: "13", rx: "2", ry: "2" }), _jsx("path", { d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" })] }) }));
}
/** The rows of a token's detail table: the record's fields, addresses and urls with a copy button. */
export function tokenDetailRows(contract) {
    return getTokenMetaData(contract).map((f) => {
        if (!f.value)
            return { label: f.label, value: 'N/A' };
        if (f.kind === 'address') {
            return {
                label: f.label,
                value: (_jsxs("span", { className: "flex items-center justify-between w-full gap-2", children: [_jsx("span", { className: "font-mono break-all", style: SP_TEXT_SM, children: f.value }), _jsx(CopyBtn, { text: f.value })] })),
            };
        }
        if (f.kind === 'url') {
            return {
                label: f.label,
                value: (_jsxs("span", { className: "flex items-center justify-between w-full gap-2", children: [_jsx("a", { href: f.value, target: "_blank", rel: "noopener noreferrer", className: "underline decoration-slate-400/60 underline-offset-2 hover:decoration-slate-200 break-all", children: f.value }), _jsx(CopyBtn, { text: f.value })] })),
            };
        }
        return { label: f.label, value: f.value };
    });
}
/** Shared body of the fixed-source token detail panels: self-heal a token that arrived without name / symbol / logo, then show its record. */
function TokenContractDetailPanel({ containerId, panelVisible, metaDataVisible, logoVisible, tokenContract, emptyTitle, emptySubtitle = 'Select a token to view its details.', }) {
    const [hydratedRecord, setHydratedRecord] = useState(undefined);
    const { exchangeContext } = useExchangeContext();
    const { loadTokenRecord } = useWalletData();
    const appChainId = exchangeContext?.apiCoreSyncedMembers?.network?.appChainId ?? 0;
    const needsHydration = !!tokenContract?.address && (!tokenContract.name || !tokenContract.symbol || !tokenContract.logoURL);
    useEffect(() => {
        if (!panelVisible || !needsHydration || !tokenContract?.address) {
            setHydratedRecord(undefined);
            return;
        }
        const chainId = tokenContract.chainId || appChainId;
        if (!chainId || !loadTokenRecord)
            return;
        let cancelled = false;
        void loadTokenRecord(chainId, tokenContract.address)
            .then((record) => {
            if (!cancelled)
                setHydratedRecord(record);
        })
            .catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, [panelVisible, needsHydration, tokenContract?.address, tokenContract?.chainId, appChainId, loadTokenRecord]);
    if (!panelVisible)
        return null;
    if (!tokenContract) {
        return (_jsx("div", { id: containerId, children: _jsxs("div", { className: "p-4 text-slate-200 text-center", style: SP_TEXT_SM, children: [_jsx("p", { className: "mb-2 font-semibold", children: emptyTitle }), _jsx("p", { className: "m-0", children: emptySubtitle })] }) }));
    }
    const displayContract = hydratedRecord && hydratedRecord.address === tokenContract.address
        ? { ...tokenContract, ...hydratedRecord }
        : tokenContract;
    const logoURL = (displayContract.logoURL ?? '').toString().trim();
    const name = (displayContract.name ?? '').toString().trim();
    const rows = tokenDetailRows(displayContract);
    return (_jsx("div", { id: containerId, children: metaDataVisible && (_jsx(ReadOnlyMetaDataTable, { rows: rows, logoURL: logoURL || defaultMissingImage, logoAlt: name, logoVisible: logoVisible })) }));
}
function TokenSlotDetailPanel({ panelEnum, metaDataEnum, logoEnum, containerId, tokenContract, emptyTitle }) {
    const panelVisible = usePanelVisible(panelEnum);
    const metaDataVisible = usePanelVisible(metaDataEnum);
    const logoVisible = usePanelVisible(logoEnum);
    return (_jsx(TokenContractDetailPanel, { containerId: containerId, panelVisible: panelVisible, metaDataVisible: metaDataVisible, logoVisible: logoVisible, tokenContract: tokenContract, emptyTitle: emptyTitle }));
}
/** Detail view for the Sponsor tab's buy token: always the active spCoin (sponsoring stakes into the currently active spCoin contract). */
export function TokenBuyPanel() {
    const { exchangeContext } = useExchangeContext();
    const tokenContract = exchangeContext?.apiCoreSyncedMembers?.activeTokens?.activeSpCoinAddress;
    return (_jsx(TokenSlotDetailPanel, { panelEnum: SP_COIN_DISPLAY.TOKEN_BUY_PANEL, metaDataEnum: SP_COIN_DISPLAY.TOKEN_BUY_META_DATA, logoEnum: SP_COIN_DISPLAY.TOKEN_BUY_LOGO, containerId: "TOKEN_BUY_PANEL", tokenContract: tokenContract, emptyTitle: "No buy token selected." }));
}
export function TokenSellPanel() {
    const { exchangeContext } = useExchangeContext();
    const tokenContract = exchangeContext?.apiCoreSyncedMembers?.activeTokens?.sponsorSellTokenContract;
    return (_jsx(TokenSlotDetailPanel, { panelEnum: SP_COIN_DISPLAY.TOKEN_SELL_PANEL, metaDataEnum: SP_COIN_DISPLAY.TOKEN_SELL_META_DATA, logoEnum: SP_COIN_DISPLAY.TOKEN_SELL_LOGO, containerId: "TOKEN_SELL_PANEL", tokenContract: tokenContract, emptyTitle: "No sell token selected." }));
}
export function TokenBuySwapPanel() {
    const { exchangeContext } = useExchangeContext();
    const tokenContract = exchangeContext?.apiCoreSyncedMembers?.activeTokens?.swapBuyTokenContract;
    return (_jsx(TokenSlotDetailPanel, { panelEnum: SP_COIN_DISPLAY.TOKEN_BUY_SWAP_PANEL, metaDataEnum: SP_COIN_DISPLAY.TOKEN_BUY_SWAP_META_DATA, logoEnum: SP_COIN_DISPLAY.TOKEN_BUY_SWAP_LOGO, containerId: "TOKEN_BUY_SWAP_PANEL", tokenContract: tokenContract, emptyTitle: "No buy token selected." }));
}
export function TokenSellSwapPanel() {
    const { exchangeContext } = useExchangeContext();
    const tokenContract = exchangeContext?.apiCoreSyncedMembers?.activeTokens?.swapSellTokenContract;
    return (_jsx(TokenSlotDetailPanel, { panelEnum: SP_COIN_DISPLAY.TOKEN_SELL_SWAP_PANEL, metaDataEnum: SP_COIN_DISPLAY.TOKEN_SELL_SWAP_META_DATA, logoEnum: SP_COIN_DISPLAY.TOKEN_SELL_SWAP_LOGO, containerId: "TOKEN_SELL_SWAP_PANEL", tokenContract: tokenContract, emptyTitle: "No sell token selected." }));
}
/** Read from tradeData.sendTokenContract, the field the web app's useSendTokenContract reads. */
export function TokenSendPanel() {
    const { exchangeContext } = useExchangeContext();
    const tokenContract = exchangeContext?.apiCoreSyncedMembers?.tradeData?.sendTokenContract;
    return (_jsx(TokenSlotDetailPanel, { panelEnum: SP_COIN_DISPLAY.TOKEN_SEND_PANEL, metaDataEnum: SP_COIN_DISPLAY.TOKEN_SEND_META_DATA, logoEnum: SP_COIN_DISPLAY.TOKEN_SEND_LOGO, containerId: "TOKEN_SEND_PANEL", tokenContract: tokenContract, emptyTitle: "No send token selected." }));
}
