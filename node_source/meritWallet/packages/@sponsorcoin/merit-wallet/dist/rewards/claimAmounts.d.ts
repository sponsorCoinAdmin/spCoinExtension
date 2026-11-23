import { type EstimateRewardsParams } from './estimateRewards';
export interface ClaimAmounts {
    /** The amount this claim pays, six decimals ("0.754545"); undefined when it cannot be worked out. */
    amountText?: string;
    /** The Total claim only: one "<Role> Rewards:" line for each role that has something pending. */
    roleAmounts?: Array<{
        label: string;
        value: string;
    }>;
}
/** 18-decimal base units as text with six decimals ("0.760260"). */
export declare function formatClaimAmount(wei: string | undefined): string;
/** What the claim `method` will pay for `accountKey`, from the same estimate the Rewards page shows. A failed estimate gives {} (the approval screen then draws no amount line, never a made-up 0). */
export declare function claimAmountsFor(method: string, params: EstimateRewardsParams): Promise<ClaimAmounts>;
