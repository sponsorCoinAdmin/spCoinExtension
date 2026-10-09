// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/TokenPanel.tsx
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt, table row 21) -- the preview-aware Token detail panel (TOKEN_PANEL), moved from the web app's
// components/views/RadioOverlayPanels/TokenPanel/index.tsx. Logic and markup are the web app's. It shows the token that was clicked
// (the engine's preview token, set before the panel opens), with the buy / sell token as a fallback for stale persisted state, self-heals a record that
// arrived without name / symbol / logo through the host's WalletDataProvider, clears the preview when the panel closes, and closes itself when it has
// nothing to show. Inputs that came from web-only hooks now come from the engine: the chain id from the exchange context (as TokenSlotPanels does),
// the token hooks and panel-tree hooks from @sponsorcoin/spcoin-exchange-engine. The web app's debug traces were dropped on the move.
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { defaultMissingImage, panelTreeOpenSourceStore, useBuyTokenContract, useExchangeContext, usePanelTree, usePanelTreeOpenSource, usePanelVisible, usePreviewTokenContract, usePreviewTokenSource, useSellTokenContract, } from '@sponsorcoin/spcoin-exchange-engine';
import { ReadOnlyMetaDataTable } from './panels';
import { tokenDetailRows } from './TokenSlotPanels';
import { useWalletData } from './walletData';
// text-sp-sm is a Tailwind token only the web app defines (var(--sp-text-sm), 1rem); an inline style gives every host the same size.
const SP_TEXT_SM = { fontSize: 'var(--sp-text-sm, 1rem)' };
/**
 * TokenPanel
 * - Single gate: TOKEN_PANEL
 * - Displays info for the currently previewed token contract (a token logo's click handler always sets a preview token before opening this panel,
 *   so preview mode is the real path; buy / sell token are a defensive fallback for stale persisted state with no preview set).
 */
export default function TokenPanel(_props) {
    const vTokenPanel = usePanelVisible(SP_COIN_DISPLAY.TOKEN_PANEL);
    const vTokenMetaData = usePanelVisible(SP_COIN_DISPLAY.TOKEN_META_DATA);
    const vTokenLogo = usePanelVisible(SP_COIN_DISPLAY.TOKEN_LOGO);
    // Specifically "is TOKEN_PANEL's own nested token picker open on top of it", not the shared ASSET_LIST_SELECT_PANEL (the list container every
    // list renders through). isTopOfStack tells a stacked picker apart from a list merely left open behind this panel.
    const vTokenList = usePanelVisible(SP_COIN_DISPLAY.REMOTE_TOKEN_LIST);
    const { closePanel, isTopOfStack } = usePanelTree();
    const fromPanelTree = usePanelTreeOpenSource(SP_COIN_DISPLAY.TOKEN_PANEL);
    const [sellToken] = useSellTokenContract();
    const [buyToken] = useBuyTokenContract();
    const [previewToken, setPreviewTokenContract] = usePreviewTokenContract();
    const [, setPreviewTokenSource] = usePreviewTokenSource();
    const isPreviewMode = previewToken != null;
    // A directly clicked preview is an unambiguous "show this" signal and is never blocked by a sibling list flag that may have been left stuck true.
    const tokenListCoversThisPanel = !isPreviewMode && vTokenList && !isTopOfStack(SP_COIN_DISPLAY.TOKEN_PANEL);
    const tokenContract = previewToken ?? buyToken ?? sellToken;
    // Self-heal incomplete records (e.g. the bare {address, chainId, balance} shape sellToken / buyToken can hold mid-hydration): the address is
    // known, so look the rest up instead of showing "N/A" for fields that can be resolved.
    const [hydratedRecord, setHydratedRecord] = useState(undefined);
    const { exchangeContext } = useExchangeContext();
    const { loadTokenRecord } = useWalletData();
    const appChainId = exchangeContext?.apiCoreSyncedMembers?.network?.appChainId ?? 0;
    const needsHydration = !!tokenContract?.address && (!tokenContract.name || !tokenContract.symbol || !tokenContract.logoURL);
    useEffect(() => {
        if (!needsHydration || !tokenContract?.address) {
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
            .catch(() => undefined); // leave hydratedRecord unset: the "N/A" fallback already handles this
        return () => {
            cancelled = true;
        };
    }, [needsHydration, tokenContract?.address, tokenContract?.chainId, appChainId, loadTokenRecord]);
    const displayContract = hydratedRecord && hydratedRecord.address === tokenContract?.address ? { ...tokenContract, ...hydratedRecord } : tokenContract;
    // Clear preview state once TOKEN_PANEL closes, so a stale preview doesn't linger for the next time it opens.
    const prevVisibleRef = React.useRef(false);
    useEffect(() => {
        const wasVisible = prevVisibleRef.current;
        prevVisibleRef.current = vTokenPanel;
        if (!wasVisible || vTokenPanel)
            return;
        if (previewToken)
            setPreviewTokenContract(undefined);
        setPreviewTokenSource(null);
    }, [vTokenPanel, previewToken, setPreviewTokenContract, setPreviewTokenSource]);
    // Auto-close when TOKEN_PANEL is open but has nothing to display (the persisted-state case: previewToken is never persisted, so after a refresh it
    // would show an empty panel forever). Skipped when opened from the debug panel tree, which is a deliberate manual force-open.
    useEffect(() => {
        if (!vTokenPanel)
            return;
        if (vTokenList)
            return;
        if (isPreviewMode)
            return;
        if (fromPanelTree)
            return;
        closePanel(SP_COIN_DISPLAY.TOKEN_PANEL, 'TokenPanel:noContent->autoClose');
    }, [vTokenPanel, isPreviewMode, vTokenList, fromPanelTree, closePanel]);
    // Once real content arrives the debug-tree signal has served its purpose; clear it so a later, genuinely empty stale open isn't also skipped.
    useEffect(() => {
        if (!fromPanelTree)
            return;
        if (isPreviewMode || vTokenList)
            panelTreeOpenSourceStore.mark(SP_COIN_DISPLAY.TOKEN_PANEL, false);
    }, [fromPanelTree, isPreviewMode, vTokenList]);
    // early return AFTER hooks
    if (!vTokenPanel || tokenListCoversThisPanel)
        return null;
    if (!tokenContract) {
        return (_jsx("div", { id: "TOKEN_PANEL", children: _jsxs("div", { className: "p-4 text-slate-200 text-center", style: SP_TEXT_SM, children: [_jsx("p", { className: "mb-2 font-semibold", children: "No token contract selected." }), _jsx("p", { className: "m-0", children: "Select a token to view its details." })] }) }));
    }
    const resolvedContract = displayContract ?? tokenContract;
    const logoURL = (resolvedContract.logoURL ?? '').toString().trim();
    const name = (resolvedContract.name ?? '').toString().trim();
    return (_jsxs("div", { id: "TOKEN_PANEL", children: [isPreviewMode && _jsx("div", { id: "TOKEN_META_DATA_PREVIEW", className: "hidden", "aria-hidden": "true" }), (isPreviewMode || vTokenMetaData) && (_jsx(ReadOnlyMetaDataTable, { rows: tokenDetailRows(resolvedContract), logoURL: logoURL || defaultMissingImage, logoAlt: name, logoVisible: vTokenLogo }))] }));
}
