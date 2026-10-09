import type { ChainRead } from '../sponsor/sponsorReads';
export interface PendingRewards {
    TYPE: '--ACCOUNT_PENDING_REWARDS--';
    accountKey: string;
    calculatedTimeStamp: string;
    annualInflation: string;
    pendingSponsorRewards: string;
    pendingRecipientRewards: string;
    pendingAgentRewards: string;
    /** Sum of the three roles (decimal string, raw base units). */
    pendingRewards: string;
    pendingTotalRewards: string;
    sponsorBucketStakedQuantity: string;
    recipientBucketStakedQuantity: string;
    agentBucketStakedQuantity: string;
}
/** floor(floor(timeDiff * totalStaked * rate / 100) / yearSeconds); a last-update in the future counts as zero elapsed time. */
export declare function accrue(totalStaked: unknown, lastUpdate: unknown, now: bigint, inflation: bigint): bigint;
/** The sponsor keeps (100 - recipientRate) % of the base; the rest is the Recipient+Agent pool. */
export declare function splitRewardPool(base: bigint, recipientRate: unknown): {
    recipientAgentPool: bigint;
    sponsorReward: bigint;
};
/** The agent gets agentRate / 1000 of the pool (at most 10 % when agentRate is 100); the recipient the remainder. */
export declare function splitAgentPool(pool: bigint, agentRate: unknown): {
    agentReward: bigint;
    recipientReward: bigint;
};
export interface EstimateRewardsParams {
    read: ChainRead;
    accountKey: string;
    /** Seconds since the epoch to estimate at (default: now). The access module's timestampOverride. */
    now?: number | bigint;
}
export declare function estimatePendingRewards({ read, accountKey, now }: EstimateRewardsParams): Promise<PendingRewards>;
/** The result of one estimate method, in the shape the run-script route returned (the Rewards panel's parsers read pending<Role>Rewards / pendingTotalRewards). */
export declare function estimateRewardsByMethod(method: string, params: EstimateRewardsParams): Promise<PendingRewards>;
