import type { ChainRead, TreeRecipient } from '../sponsor/sponsorReads';
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
/**
 * 2026-11-14 (owner: the Claim list shows each row's pending reward beside its staked amount): fills in, for every bucket of a staking tree, the reward it has earned so far for the role being claimed, with the same formulas as
 * estimatePendingRewards (so the rows add up to the Pending amount on the Rewards page). In the tree, recipientKey is the row's account: the recipient when role is Sponsor (the account sponsors them), the sponsor when
 * role is Recipient (the account is the recipient). The bucket's own stake gets pendingDirect; each agent-rate leaf gets pending. Sponsor claims count the sponsor's share of every bucket; Recipient claims count the
 * recipient's share (the whole Recipient+Agent pool of a direct bucket, the pool less the agent's cut for an agent bucket). Agent trees merge buckets across recipients, so they are not supported here.
 * It returns a function that recomputes every figure for a later time from what was read (the stakes and reward clocks do not change between claims), so Auto Refresh can tick the amounts without reading the chain again.
 */
export declare function addPendingToTree(role: 'Sponsor' | 'Recipient', account: string, tree: TreeRecipient[], read: ChainRead, now?: number | bigint): Promise<(at?: number | bigint) => void>;
