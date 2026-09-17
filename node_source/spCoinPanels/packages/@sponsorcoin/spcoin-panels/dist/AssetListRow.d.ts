import React from 'react';
export interface AssetListRowProps {
    icon?: React.ReactNode;
    /** Convenience alternative to `icon` — a resolved image URL/data URL
     *  that this row turns into an actual <img> itself, same convention as
     *  MeritWalletNetworkRow.iconSrc/AccountListEntry.iconSrc (this
     *  package's network/account row equivalents). Ignored when `icon` is
     *  already given. */
    iconSrc?: string;
    symbol?: string;
    name?: string;
    address?: string;
    onSelect?: () => void;
    onInfoClick?: () => void;
    /** Overrides the info button's own icon — see WalletHeader.tsx's
     *  identical `iconSrc` doc comment for why this is a prop rather than a
     *  hardcoded app-relative path (the extension bundles its own copy and
     *  passes `chrome.runtime.getURL(...)` in). */
    infoIconSrc?: string;
    /** 2026-09-15, added for AccountListCard.tsx's own reuse of this row —
     *  an inline suffix on the Symbol|Name line itself (e.g. an "ACTIVE"
     *  tag), matching the real app's AccountRow.tsx own nameLineSuffix use.
     *  Forwarded straight through to AssetSelectDropDown; omitted by every
     *  other caller of this row (Token/Agent/Recipient/Account-list), which
     *  have no such badge. */
    badge?: React.ReactNode;
}
export default function AssetListRow({ icon, iconSrc, symbol, name, address, onSelect, onInfoClick, infoIconSrc, badge, }: AssetListRowProps): import("react/jsx-runtime").JSX.Element;
