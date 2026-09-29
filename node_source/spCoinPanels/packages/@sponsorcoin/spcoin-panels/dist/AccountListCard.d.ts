import React from 'react';
import { type AssetListRowProps } from './AssetListRow';
export interface AccountListEntry extends Omit<AssetListRowProps, 'badge'> {
    id: string;
    /** This row is the group/app's currently active account — renders the
     *  same green "ACTIVE" tag AccountRow.tsx's own isActiveMarker does. */
    isActive?: boolean;
    /** Convenience alternative to `icon` — a resolved image URL/data URL
     *  that MeritWallet.tsx turns into an actual <img> itself, same
     *  convention as MeritWalletNetworkRow.iconSrc (this package's own
     *  network-row equivalent). Ignored when `icon` is already given. */
    iconSrc?: string;
}
export interface AccountListGroup {
    id: string;
    /** "Merit Wallet" / "MetaMask" / "Watch-only" — GroupedAccountList.tsx's
     *  own GROUP_LABEL values. */
    label: string;
    /** Whether this group is the app's current active source — drives the
     *  Active(green)/Inactive(red) status badge. */
    isActiveSource: boolean;
    /** When provided (typically only the MetaMask-style group) and
     *  `!isActiveSource`, the status badge becomes a clickable "Connect"
     *  button instead of a plain "Inactive" label — matches
     *  GroupedAccountList.tsx's own metaMaskHeaderBadge prop. */
    connectLabel?: string;
    onConnectClick?: () => void;
    accounts: AccountListEntry[];
}
export interface AccountListCardProps {
    groups: AccountListGroup[];
    onAddWalletAccount?: () => void;
    infoIconSrc?: string;
}
export default function AccountListCard({ groups, onAddWalletAccount, infoIconSrc }: AccountListCardProps): React.JSX.Element;
