import React from 'react';
export interface WalletAccountHeaderRoles {
    isSponsor: boolean;
    isRecipient: boolean;
    isAgent: boolean;
}
export interface WalletAccountHeaderProps {
    /** The account picker pill itself — an opaque slot, exactly like
     *  WalletHeader.tsx's own leftSlot. Pass the caller's own real
     *  component here (e.g. the web app's AccountSelectDropDown) to get
     *  its real behavior for free; omit to fall back to this package's own
     *  AssetSelectDropDown-based placeholder, built from the icon/address/
     *  symbol/name/... props below (unchanged from before this file had
     *  slots at all). */
    pillSlot?: React.ReactNode;
    /** The role badges (S/R/A) — opaque slot, same pattern as pillSlot.
     *  Pass `null` explicitly to render no role area at all; omit to fall
     *  back to this package's own static role table, built from `roles`/
     *  `onRoleClick` below. */
    roleSlot?: React.ReactNode | null;
    /** Rendered in the icon slot when an account is selected. Omit for the
     *  unselected placeholder — no default avatar, since there's no default
     *  account to show one for. */
    icon?: React.ReactNode;
    address?: string;
    symbol?: string;
    name?: string;
    /** Shown (before ": ") when nothing is selected — the only real state
     *  this component has anything to render for today. */
    placeholderLabel?: string;
    /** Called on row click (e.g. open an account picker). Omit for an inert
     *  row with no picker to open yet. */
    onSelectClick?: () => void;
    onIconClick?: (address: string) => void;
    /** Flips the chevron to point up while whatever picker this opens is
     *  already showing — same chevronUp convention NetworkSelectDropDown's
     *  own trigger mode uses. Defaults false (closed). */
    chevronUp?: boolean;
    /** Defaults to every role false/inert — matches "no account, no roles"
     *  rather than fabricating a role that isn't real. */
    roles?: WalletAccountHeaderRoles;
    /** Called with which role badge was clicked, only for roles that are
     *  true (matches the app's own "only an active role opens Rewards"
     *  behavior). Omit — the default — and every badge is inert regardless
     *  of `roles`. */
    onRoleClick?: (role: 'sponsor' | 'recipient' | 'agent') => void;
}
export default function WalletAccountHeader({ pillSlot, roleSlot, icon, address, symbol, name, placeholderLabel, roles, onSelectClick, onIconClick, onRoleClick, chevronUp, }: WalletAccountHeaderProps): React.JSX.Element;
