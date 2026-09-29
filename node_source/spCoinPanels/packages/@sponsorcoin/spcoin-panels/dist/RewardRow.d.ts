import React from 'react';
export declare const REWARD_ROW_BG_A = "rgba(56,78,126,0.35)";
export declare const REWARD_ROW_BG_B = "rgba(156,163,175,0.25)";
export declare const REWARD_ROW_LABEL_WIDTH = 105;
export interface RewardRowProps {
    label: string;
    amountText: string;
    buttonLabel: string;
    onClick?: () => void;
    /** Sponsor/Recipient/Agent sub-rows are indented with a bullet, matching
     *  the real app's "  •  Sponsor" nested-row treatment. */
    indent?: boolean;
    /** Matches the real app's red "N/A" styling for a role that isn't
     *  available for the current account (see RewardsPendingByAccountTypePanel's
     *  own defaults). */
    unavailable?: boolean;
    /** Zebra-stripe background — pass REWARD_ROW_BG_A/REWARD_ROW_BG_B,
     *  alternating per row, to match the real table's own rowA/rowB. */
    rowBg?: string;
}
export default function RewardRow({ label, amountText, buttonLabel, onClick, indent, unavailable, rowBg }: RewardRowProps): React.JSX.Element;
