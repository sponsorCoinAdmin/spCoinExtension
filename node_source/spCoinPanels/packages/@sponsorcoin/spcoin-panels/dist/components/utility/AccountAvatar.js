// File: src/components/utility/AccountAvatar.tsx
// Minimal portable AccountAvatar — display-only image rendering with an
// optional onClick passthrough. The full web-app version
// (spcoin-nextjs-front-end/components/utility/AccountAvatar.tsx) wraps this
// with ExchangeContext-bound account-panel navigation (useOpenAccountComponent,
// useWalletAccountsList) and a 4-branch click handler; those hooks are
// non-portable (web-app-only) so they live in the web-app wrapper, not here.
// This component handles only the avatar <img> resolution + preload, same
// pattern TokenLogo.tsx uses for token logos.
'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { useCallback } from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { defaultMissingImage, usePreloadedImageSrc } from '@sponsorcoin/spcoin-exchange-engine';
export function getAccountRoleLabel(mode) {
    switch (mode) {
        case SP_COIN_DISPLAY.SPONSOR_ACCOUNT:
            return 'SPONSOR';
        case SP_COIN_DISPLAY.RECIPIENT_ACCOUNT:
            return 'RECIPIENT';
        case SP_COIN_DISPLAY.AGENT_ACCOUNT:
            return 'AGENT';
        case SP_COIN_DISPLAY.ACTIVE_ACCOUNT:
        default:
            return 'ACCOUNT';
    }
}
export default function AccountAvatar({ account, mode = SP_COIN_DISPLAY.ACTIVE_ACCOUNT, logoURL, symbol, name, address, className = 'h-10 w-10 object-contain', title, roleLabel, onClick, }) {
    const resolvedLogo = (account?.logoURL ?? logoURL)?.trim() || defaultMissingImage;
    const resolvedSymbol = account?.symbol ?? symbol;
    const resolvedName = account?.name ?? name;
    const resolvedAddress = account ? String(account.address ?? '') : (address ?? '');
    const src = usePreloadedImageSrc(resolvedLogo, defaultMissingImage) ?? resolvedLogo;
    const resolvedRoleLabel = roleLabel ?? getAccountRoleLabel(mode);
    const identity = [resolvedSymbol, resolvedName].filter(Boolean).join(': ');
    const defaultTooltip = [resolvedRoleLabel, identity].filter(Boolean).join(': ') || resolvedAddress || '';
    const tooltip = title ?? defaultTooltip;
    const handleClick = useCallback((e) => {
        e.stopPropagation();
        if (onClick) {
            onClick(e);
            return;
        }
    }, [onClick]);
    return (_jsx("img", { src: src, alt: tooltip || 'Account', title: tooltip, className: `${onClick ? 'cursor-pointer' : ''} ${className}`, onError: (e) => { e.currentTarget.src = defaultMissingImage; }, onClick: handleClick }));
}
