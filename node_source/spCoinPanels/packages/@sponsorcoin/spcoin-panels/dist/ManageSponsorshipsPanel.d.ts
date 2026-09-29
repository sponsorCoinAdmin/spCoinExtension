import React from 'react';
export type ManageSponsorshipRole = 'Sponsor' | 'Recipient' | 'Agent';
export interface ManageSponsorshipRoleRow {
    role: ManageSponsorshipRole;
    amount?: string;
    available?: boolean;
    loading?: boolean;
    error?: string;
}
export interface ManageSponsorshipsPanelProps {
    tradingAmountText?: string;
    stakedAmountText?: string;
    pendingAmountText?: string;
    totalCoinsText?: string;
    onStake?: () => void;
    onUnstake?: () => void;
    /** @deprecated No-op; retained so existing callers compile. */
    onTogglePending?: () => void;
    /** @deprecated No-op; retained so existing callers compile. */
    onClaimAll?: () => void;
    /** @deprecated No-op; retained so existing callers compile. */
    pendingByAccountType?: unknown;
    addressSelectContent?: React.ReactNode;
    todoContent?: React.ReactNode;
    autoRefresh?: boolean;
    onAutoRefreshChange?: (v: boolean) => void;
    /** Mirrors the real `tradingOrStalledLoading` (accountRecordLoading). */
    tradingOrStalledLoading?: boolean;
    tradingIsZero?: boolean;
    stakedIsZero?: boolean;
    /** Opens the ACTIVE_SPONSORSHIPS list when the Staked label is clicked. */
    onStakedLabelClick?: () => void;
    /** True => group expanded (MANAGE_PENDING_REWARDS open). Defaults to TRUE
     *  when omitted so the extension renders the table fully expanded by
     *  default; the web wrapper always passes this explicitly. */
    pendingVisible?: boolean;
    pendingInitialLoading?: boolean;
    pendingRoleUnavailable?: boolean;
    pendingIsZero?: boolean;
    /** True when a total-reward claim is in flight; renders the "..." spinner. */
    pendingClaimInProgress?: boolean;
    /** True => the collapsed Pending Claim button must be natively disabled
     *  (no active account/contract, or claim already in flight). */
    pendingClaimDisabled?: boolean;
    pendingErrorText?: string;
    onPendingEstimate?: () => void;
    onPendingClaim?: () => void;
    /** Right-click on the collapsed Pending row opens the group. */
    onOpenPendingGroup?: () => void;
    /** Left-click on the expanded Pending header re-estimates roles. */
    onPendingHeaderEstimate?: () => void;
    /** Right-click on the expanded Pending header closes the group. */
    onClosePendingGroup?: () => void;
    rewardRows?: ManageSponsorshipRoleRow[];
    onRoleEstimate?: (role: ManageSponsorshipRole) => void;
    onRoleClaim?: (role: ManageSponsorshipRole) => void;
}
export default function ManageSponsorshipsPanel({ tradingAmountText, stakedAmountText, pendingAmountText, totalCoinsText, tradingOrStalledLoading, tradingIsZero, onStake, onUnstake, onStakedLabelClick, stakedIsZero, autoRefresh, onAutoRefreshChange, pendingVisible, pendingInitialLoading, pendingRoleUnavailable, pendingIsZero, pendingClaimInProgress, pendingClaimDisabled, pendingErrorText, onPendingEstimate, onPendingClaim, onOpenPendingGroup, onPendingHeaderEstimate, onClosePendingGroup, rewardRows, onRoleEstimate, onRoleClaim, addressSelectContent, todoContent, }: ManageSponsorshipsPanelProps): React.JSX.Element;
