// @ts-nocheck
import { calculateClaimedRewards } from './calculateClaimedRewards';

async function getPending(context, accountKey, optionsOrTimestampOverride = undefined, timestampOverride = undefined) {
    return await calculateClaimedRewards(context, accountKey, optionsOrTimestampOverride, timestampOverride);
}

function selectRewards(result, role) {
    const pending = result && typeof result === "object" ? result : {};
    const pendingSponsorRewards = String(pending.pendingSponsorRewards ?? "0");
    const pendingRecipientRewards = String(pending.pendingRecipientRewards ?? "0");
    const pendingAgentRewards = String(pending.pendingAgentRewards ?? "0");
    const pendingTotalRewards = String(pending.pendingRewards ?? "0");
    const pendingRewardsAllRoles = {
            pendingSponsorRewards,
            pendingRecipientRewards,
            pendingAgentRewards,
        };
    const pendingRewardsByAccount =
        pending.__pendingRewardsByAccount && typeof pending.__pendingRewardsByAccount === "object"
            ? pending.__pendingRewardsByAccount
            : undefined;
    const rewardFormulaTrace =
        Array.isArray(pending.__rewardFormulaTrace)
            ? pending.__rewardFormulaTrace
            : undefined;
    const roleRewards =
        role === "sponsor"
            ? { pendingSponsorRewards }
            : role === "recipient"
              ? { pendingRecipientRewards }
              : role === "agent"
                ? { pendingAgentRewards }
                : {};
    if (role === "sponsor") {
        return {
            TYPE: "--ACCOUNT_PENDING_SPONSOR_REWARDS--",
            accountKey: String(pending.accountKey ?? ""),
            calculatedTimeStamp: String(pending.calculatedTimeStamp ?? "0"),
            calculatedFormatted: String(pending.calculatedFormatted ?? ""),
            annualInflation: String(pending.annualInflation ?? "10"),
            lastSponsorUpdate: String(pending.lastSponsorUpdate ?? "0"),
            sponsorBucketLastUpdateTimeStamp: String(pending.sponsorBucketLastUpdateTimeStamp ?? "0"),
            steakedBalance: String(pending.sponsorBucketStakedQuantity ?? "0"),
            ...roleRewards,
            pendingTotalRewards,
            __pendingRewardsAllRoles: pendingRewardsAllRoles,
            ...(pendingRewardsByAccount ? { __pendingRewardsByAccount: pendingRewardsByAccount } : {}),
            ...(rewardFormulaTrace ? { __rewardFormulaTrace: rewardFormulaTrace } : {}),
        };
    }
    if (role === "recipient") {
        return {
            TYPE: "--ACCOUNT_PENDING_RECIPIENT_REWARDS--",
            accountKey: String(pending.accountKey ?? ""),
            calculatedTimeStamp: String(pending.calculatedTimeStamp ?? "0"),
            calculatedFormatted: String(pending.calculatedFormatted ?? ""),
            annualInflation: String(pending.annualInflation ?? "10"),
            lastRecipientUpdate: String(pending.lastRecipientUpdate ?? "0"),
            recipientBucketLastUpdateTimeStamp: String(pending.recipientBucketLastUpdateTimeStamp ?? "0"),
            steakedBalance: String(pending.recipientBucketStakedQuantity ?? "0"),
            ...roleRewards,
            pendingTotalRewards,
            __pendingRewardsAllRoles: pendingRewardsAllRoles,
            ...(pendingRewardsByAccount ? { __pendingRewardsByAccount: pendingRewardsByAccount } : {}),
            ...(rewardFormulaTrace ? { __rewardFormulaTrace: rewardFormulaTrace } : {}),
        };
    }
    if (role === "agent") {
        return {
            TYPE: "--ACCOUNT_PENDING_AGENT_REWARDS--",
            accountKey: String(pending.accountKey ?? ""),
            calculatedTimeStamp: String(pending.calculatedTimeStamp ?? "0"),
            calculatedFormatted: String(pending.calculatedFormatted ?? ""),
            annualInflation: String(pending.annualInflation ?? "10"),
            lastAgentUpdate: String(pending.lastAgentUpdate ?? "0"),
            agentBucketLastUpdateTimeStamp: String(pending.agentBucketLastUpdateTimeStamp ?? "0"),
            steakedBalance: String(pending.agentBucketStakedQuantity ?? "0"),
            ...roleRewards,
            pendingTotalRewards,
            __pendingRewardsAllRoles: pendingRewardsAllRoles,
            ...(pendingRewardsByAccount ? { __pendingRewardsByAccount: pendingRewardsByAccount } : {}),
            ...(rewardFormulaTrace ? { __rewardFormulaTrace: rewardFormulaTrace } : {}),
        };
    }
    return {
        ...pending,
        TYPE: "--ACCOUNT_PENDING_TOTAL_REWARDS--",
        annualInflation: String(pending.annualInflation ?? "10"),
        pendingTotalRewards: String(pending.pendingRewards ?? "0"),
        __pendingRewardsAllRoles: pendingRewardsAllRoles,
        ...(pendingRewardsByAccount ? { __pendingRewardsByAccount: pendingRewardsByAccount } : {}),
        ...(rewardFormulaTrace ? { __rewardFormulaTrace: rewardFormulaTrace } : {}),
    };
}

export const estimateOffChainTotalRewards = async (context, accountKey, optionsOrTimestampOverride = undefined, timestampOverride = undefined) =>
    selectRewards(await getPending(context, accountKey, optionsOrTimestampOverride, timestampOverride), "total");
export const estimateOffChainSponsorRewards = async (context, accountKey, optionsOrTimestampOverride = undefined, timestampOverride = undefined) =>
    selectRewards(await getPending(context, accountKey, optionsOrTimestampOverride, timestampOverride), "sponsor");
export const estimateOffChainRecipientRewards = async (context, accountKey, optionsOrTimestampOverride = undefined, timestampOverride = undefined) =>
    selectRewards(await getPending(context, accountKey, optionsOrTimestampOverride, timestampOverride), "recipient");
export const estimateOffChainAgentRewards = async (context, accountKey, optionsOrTimestampOverride = undefined, timestampOverride = undefined) =>
    selectRewards(await getPending(context, accountKey, optionsOrTimestampOverride, timestampOverride), "agent");
