import { type RewardsPendingByAccountTypePanelProps } from './RewardsPendingByAccountTypePanel';
export interface ManageSponsorshipsPanelProps {
    tradingAmountText?: string;
    stakedAmountText?: string;
    pendingAmountText?: string;
    totalCoinsText?: string;
    onStake?: () => void;
    onUnstake?: () => void;
    /** Toggles the real app's own MANAGE_PENDING_REWARDS-equivalent
     *  (RewardsPendingByAccountTypePanel's own gate) — see
     *  MeritWallet.tsx's own onTogglePendingRewards for where this is
     *  actually wired to meritPanelState.setVisible. */
    onTogglePending?: () => void;
    onClaimAll?: () => void;
    /** Forwarded straight through to RewardsPendingByAccountTypePanel. */
    pendingByAccountType?: RewardsPendingByAccountTypePanelProps;
}
export default function ManageSponsorshipsPanel({ tradingAmountText, stakedAmountText, pendingAmountText, totalCoinsText, onStake, onUnstake, onTogglePending, onClaimAll, pendingByAccountType, }: ManageSponsorshipsPanelProps): import("react/jsx-runtime").JSX.Element;
