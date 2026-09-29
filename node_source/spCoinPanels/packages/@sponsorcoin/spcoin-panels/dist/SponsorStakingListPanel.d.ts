import React from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { type spCoinAccount } from '@sponsorcoin/spcoin-common/context';
export interface AgentRateStakeInfo {
    agentRateKey: string;
    stakedSPCoins: string;
}
export interface AgentStakeInfo {
    account: spCoinAccount;
    stakedSPCoins: string;
    agentRates: AgentRateStakeInfo[];
    failed?: boolean;
}
export interface RecipientStakeInfo {
    rateKey: string;
    stakedSPCoins: string;
    agentAccounts: AgentStakeInfo[];
    agentKeysFailed?: boolean;
}
export interface UnstakeTarget {
    recipient: spCoinAccount;
    amount: string;
    rateKey?: string;
    agent?: spCoinAccount;
    agentRateKey?: string;
}
export type SponsorStakingAccountCellSlot = React.FC<{
    account: spCoinAccount;
    mode: typeof SP_COIN_DISPLAY.RECIPIENT_ACCOUNT | typeof SP_COIN_DISPLAY.AGENT_ACCOUNT;
    label: string;
    addrPrePostSize?: number;
    addressSizeClassName?: string;
    onAddressClick?: (e: React.MouseEvent) => void;
}>;
export interface SponsorStakingListPanelProps {
    recipients: spCoinAccount[];
    stakeInfoByAddress: Record<string, RecipientStakeInfo[] | undefined>;
    decimals: number;
    loading: boolean;
    error?: string;
    /** Which row is currently mid-unstake (drives "Unstaking…" button state). Managed by the wrapper. */
    activeUnstakeKey?: string | null;
    /** Opaque slot: recipient/agent account cell (web app: AccountSelectDropDown wrapper). Defaults to plain <img>. */
    accountCellSlot?: SponsorStakingAccountCellSlot;
    /** Opaque slot: avatar-only rendering (web app: AccountAvatar). Defaults to plain <img>. */
    avatarSlot?: (account: spCoinAccount) => React.ReactNode;
    /** Opaque slot for loading indicator (web app: <LoadingText/>). */
    loadingContent?: React.ReactNode;
    /** Opaque slot: the unstake confirmation popup (web app: <StakeConfirmPopup/>). */
    confirmPopupContent?: (props: {
        isOpen: boolean;
        target: UnstakeTarget | null;
        totalAmount: string | undefined;
        onConfirm: (amount?: string) => void;
        onCancel: () => void;
    }) => React.ReactNode;
    /** Called when the popup's confirm button is clicked; the wrapper runs the actual unstakeSpCoin call. */
    onConfirmUnstake?: (target: UnstakeTarget, amount?: string) => Promise<void> | void;
    /** Called when the popup is cancelled. */
    onCancelUnstake?: () => void;
    panelId?: SP_COIN_DISPLAY;
}
export declare function formatTokenAmount(rawValue: unknown, decimals: number): string;
export declare function formatTokenAmountCapped(rawValue: unknown, decimals: number, maxChars?: number): string;
export declare function sumStakedRaw(entries: RecipientStakeInfo[]): bigint;
export declare function sumAgentStakedRaw(agentAccounts: AgentStakeInfo[]): bigint;
export default function SponsorStakingListPanel({ recipients, stakeInfoByAddress, decimals, loading, error, activeUnstakeKey, accountCellSlot, avatarSlot, loadingContent, confirmPopupContent, onConfirmUnstake, onCancelUnstake, panelId, }: SponsorStakingListPanelProps): React.JSX.Element;
