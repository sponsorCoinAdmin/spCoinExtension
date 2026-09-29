// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/TokenLogo.tsx
// 2026-09-25, migrated from spcoin-nextjs-front-end's
// components/utility/TokenLogo.tsx (on request, "do issue 2"). Every
// dependency this component had turned out to be genuinely portable once
// traced file-by-file — see @sponsorcoin/spcoin-exchange-engine's own
// index.ts header comment (2026-09-25 "do issue 2" entry) for the full
// per-piece reasoning (chain-id mapping, disk-path resolution, the
// minimal getTokenLogoURL slice of assetHelpers.ts, the two preview-token
// hooks, usePreloadedImageSrc). Byte-identical move, no opaque-slot split
// needed — unlike AccountAvatar (still blocked, see docs/
// npmMigrationDesign.md's own AGENT_HEADER_PANEL entry), TokenLogo had no
// genuinely non-portable piece once its real dependency chain was
// actually read.
'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { useCallback, useMemo } from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { usePanelTree, usePreviewTokenContract, usePreviewTokenSource, defaultMissingImage, getTokenLogoURL, usePreloadedImageSrc, } from '@sponsorcoin/spcoin-exchange-engine';
export default function TokenLogo({ tokenContract, logoURL, symbol, name, address, chainId, className = 'h-9 w-9 object-contain', title, onClick, targetPanel = SP_COIN_DISPLAY.TOKEN_PANEL, }) {
    const { openPanel } = usePanelTree();
    const [, setPreviewTokenContract] = usePreviewTokenContract();
    const [, setPreviewTokenSource] = usePreviewTokenSource();
    const resolvedLogoURL = tokenContract?.logoURL ?? logoURL;
    const resolvedSymbol = tokenContract?.symbol ?? symbol;
    const resolvedName = tokenContract?.name ?? name;
    const resolvedAddress = tokenContract?.address ?? address;
    const resolvedChainId = tokenContract?.chainId ?? chainId;
    const resolvedTitle = title ?? [resolvedSymbol, resolvedName].filter(Boolean).join(': ');
    const resolved = useMemo(() => {
        const raw = resolvedLogoURL?.trim();
        if (raw?.startsWith('http://') || raw?.startsWith('https://'))
            return raw;
        if (resolvedAddress && typeof resolvedChainId === 'number') {
            return getTokenLogoURL({ address: resolvedAddress, chainId: resolvedChainId });
        }
        if (raw && raw.length > 0)
            return raw.startsWith('/') ? raw : `/${raw.replace(/^\/+/, '')}`;
        return defaultMissingImage;
    }, [resolvedLogoURL, resolvedAddress, resolvedChainId]);
    // Holds the previous logo on screen until `resolved`'s new URL has
    // actually finished loading in the background, instead of handing the
    // <img> a brand-new (often uncached) URL and letting it go blank
    // mid-swap.
    const src = usePreloadedImageSrc(resolved, defaultMissingImage) ?? resolved;
    const tooltip = [resolvedSymbol, resolvedName].filter(Boolean).join(': ') || '';
    const handleClick = useCallback((e) => {
        e.stopPropagation();
        if (onClick) {
            onClick(e);
            return;
        }
        if (!resolvedAddress)
            return;
        // Preview-mode plumbing is TOKEN_PANEL's own — its "whichever token
        // was last clicked" resolution reads previewTokenContract. The 4
        // dedicated Swap/Sponsor buy/sell panels each already have one
        // fixed, unambiguous activeTokens.* source of their own, so they
        // don't need (and shouldn't touch) this global preview state.
        if (targetPanel === SP_COIN_DISPLAY.TOKEN_PANEL) {
            setPreviewTokenSource(null);
            setPreviewTokenContract({
                address: resolvedAddress,
                name: resolvedName || '',
                symbol: resolvedSymbol || '',
                // The real resolved URL, not whatever's currently on screen —
                // `src` can legitimately lag a render or two behind `resolved`
                // while the preload hold is in flight, and the committed
                // preview should always reflect the actual intended logo, not
                // a mid-transition frame.
                logoURL: resolved,
                balance: 0n,
            });
        }
        openPanel(targetPanel, 'TokenLogo:click');
    }, [onClick, resolvedAddress, resolvedName, resolvedSymbol, resolved, setPreviewTokenSource, setPreviewTokenContract, openPanel, targetPanel]);
    return (_jsx("img", { src: src, alt: resolvedTitle || tooltip || 'Token', title: resolvedTitle || tooltip, className: `cursor-pointer ${className}`, onError: (e) => {
            e.currentTarget.src = defaultMissingImage;
        }, onClick: handleClick }));
}
