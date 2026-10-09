// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/ConnectedNetworkPanel.tsx
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt, row 8 / S2b-4b) -- the network detail overlay (NETWORK_PANEL), wired to the exchange engine,
// written once for both hosts. It is the web app's components/views/RadioOverlayPanels/NetworkPanel/index.tsx moved: same gates, same
// preview-then-live logic, same rows. Where the inputs come from is what changed, the MetaMask way (one network registry that every screen
// reads, like its NetworkController):
//   - the preview store is the engine's (previewNetworkStore, moved there unchanged);
//   - a chain's name, symbol, logo, explorer and RPC come from spcoin-feeds' network registry (getNetworkConfiguration);
//   - the host may override how the live network and a previewed chain are resolved, and how the extra info.json fields are loaded: the web
//     app does, so what it shows stays exactly what it showed (it still resolves names and symbols through its own helpers until those are
//     rebased on the registry, a separate step: the two sources differ for Base, Polygon and Sepolia).
// A host that passes nothing gets the registry defaults, which is what the extension uses.
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { defaultMissingImage, previewNetworkStore, useExchangeContext, usePanelVisible, usePreviewNetworkChainId, } from '@sponsorcoin/spcoin-exchange-engine';
import { getNetworkConfiguration } from '@sponsorcoin/spcoin-feeds/networks';
import { getNetworkMetaData } from '@sponsorcoin/spcoin-panels';
import { ReadOnlyMetaDataTable } from './panels';
import { useWalletData } from './walletData';
// text-sp-sm is a Tailwind token only the web app defines (var(--sp-text-sm), 1rem); an inline style gives every host the same size.
const SP_TEXT_SM = { fontSize: 'var(--sp-text-sm, 1rem)' };
function CopyBtn({ text }) {
    return (_jsx("button", { type: "button", title: "Copy to clipboard", onClick: () => void navigator.clipboard.writeText(text), className: "shrink-0 text-slate-400 hover:text-white transition-colors", children: _jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", width: "22", height: "22", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("rect", { x: "9", y: "9", width: "13", height: "13", rx: "2", ry: "2" }), _jsx("path", { d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" })] }) }));
}
/** A NetworkElement for a chain id straight from the registry (the default for previewing a chain other than the live one). */
export function networkElementFromRegistry(chainId) {
    const cfg = getNetworkConfiguration(chainId);
    return {
        connected: false,
        appChainId: 0,
        chainId,
        name: cfg?.name ?? '',
        symbol: cfg?.symbol ?? '',
        logoURL: cfg?.logoURL ?? '',
        url: cfg?.explorerUrl ?? '',
        rpcUrl: cfg?.rpcUrl ?? '',
    };
}
/** Default live network: the exchange context's network, filled in from the registry the way the web app's useNetwork fills it from its helpers. */
export function useLiveNetworkFromContext() {
    const { exchangeContext } = useExchangeContext();
    const ctxNet = (exchangeContext?.apiCoreSyncedMembers?.network ?? {});
    const chainId = ctxNet.appChainId || 0;
    const cfg = getNetworkConfiguration(chainId);
    const network = {
        ...ctxNet,
        chainId,
        name: ctxNet.name || cfg?.name || '',
        logoURL: ctxNet.logoURL || cfg?.logoURL || '',
        url: ctxNet.url || cfg?.explorerUrl || '',
        rpcUrl: ctxNet.rpcUrl || '',
        connected: !!ctxNet.connected,
    };
    return { network, chainId };
}
export default function ConnectedNetworkPanel({ useLiveNetwork = useLiveNetworkFromContext }) {
    const vNetworkPanel = usePanelVisible(SP_COIN_DISPLAY.NETWORK_PANEL);
    const vNetworkMetaData = usePanelVisible(SP_COIN_DISPLAY.NETWORK_META_DATA);
    const vNetworkLogo = usePanelVisible(SP_COIN_DISPLAY.NETWORK_LOGO);
    const { resolveNetwork, loadNetworkInfo } = useWalletData();
    const { network: liveNetwork, chainId: liveChainId } = useLiveNetwork();
    const previewChainId = usePreviewNetworkChainId();
    const isPreviewMode = previewChainId != null;
    const previewNetwork = useMemo(() => (isPreviewMode ? (resolveNetwork ?? networkElementFromRegistry)(previewChainId) : undefined), [isPreviewMode, previewChainId, resolveNetwork]);
    const network = previewNetwork ?? liveNetwork;
    const chainId = isPreviewMode ? previewChainId : liveChainId;
    // Self-heal the fields NetworkElement doesn't carry (website/description) from the network's own info.json.
    const [info, setInfo] = useState(undefined);
    useEffect(() => {
        if (!vNetworkPanel || !chainId) {
            setInfo(undefined);
            return;
        }
        let cancelled = false;
        const load = loadNetworkInfo
            ? loadNetworkInfo(chainId)
            : fetch(`/assets/blockchains/${chainId}/info.json`).then((res) => (res.ok ? res.json() : undefined));
        load
            .then((data) => {
            if (!cancelled)
                setInfo(data);
        })
            .catch(() => {
            if (!cancelled)
                setInfo(undefined);
        });
        return () => {
            cancelled = true;
        };
    }, [vNetworkPanel, chainId, loadNetworkInfo]);
    // Clear the preview once NETWORK_PANEL closes, so a stale preview doesn't linger for the next time it's opened.
    const prevVisibleRef = useRef(false);
    useEffect(() => {
        const wasVisible = prevVisibleRef.current;
        prevVisibleRef.current = vNetworkPanel;
        if (!wasVisible || vNetworkPanel)
            return;
        previewNetworkStore.clear();
    }, [vNetworkPanel]);
    if (!vNetworkPanel)
        return null;
    if (!chainId) {
        return (_jsx("div", { id: "NETWORK_PANEL", children: _jsxs("div", { className: "p-4 text-slate-200 text-center", style: SP_TEXT_SM, children: [_jsx("p", { className: "mb-2 font-semibold", children: "No network selected." }), _jsx("p", { className: "m-0", children: "Select a network to view its details." })] }) }));
    }
    const resolvedNetwork = { ...network, ...info };
    const logoURL = (resolvedNetwork.logoURL ?? '').toString().trim();
    const name = (resolvedNetwork.name ?? '').toString().trim();
    const rows = getNetworkMetaData(resolvedNetwork).map((f) => {
        if (!f.value)
            return { label: f.label, value: 'N/A' };
        if (f.kind === 'url') {
            return {
                label: f.label,
                value: (_jsxs("span", { className: "flex items-center justify-between w-full gap-2", children: [_jsx("a", { href: f.value, target: "_blank", rel: "noopener noreferrer", className: "underline decoration-slate-400/60 underline-offset-2 hover:decoration-slate-200 break-all", children: f.value }), _jsx(CopyBtn, { text: f.value })] })),
            };
        }
        return { label: f.label, value: f.value };
    });
    return (_jsx("div", { id: "NETWORK_PANEL", children: vNetworkMetaData && (_jsx(ReadOnlyMetaDataTable, { rows: rows, logoURL: logoURL || defaultMissingImage, logoAlt: name, logoVisible: vNetworkLogo, 
            // Network logos are already complete, self-contained circular brand marks with real transparent padding, so no navy fill behind
            // them and no card frame around them (unlike token and account logos).
            logoBackgroundClassName: "", logoContainerClassName: "p-2" })) }));
}
