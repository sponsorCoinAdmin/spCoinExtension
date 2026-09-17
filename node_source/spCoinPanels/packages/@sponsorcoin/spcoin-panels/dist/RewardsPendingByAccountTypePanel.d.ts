export interface RewardsPendingByAccountTypePanelProps {
    sponsorAmountText?: string;
    recipientAmountText?: string;
    agentAmountText?: string;
    onClaimSponsor?: () => void;
    onClaimRecipient?: () => void;
    onClaimAgent?: () => void;
}
export default function RewardsPendingByAccountTypePanel({ sponsorAmountText, recipientAmountText, agentAmountText, onClaimSponsor, onClaimRecipient, onClaimAgent, }: RewardsPendingByAccountTypePanelProps): import("react/jsx-runtime").JSX.Element;
