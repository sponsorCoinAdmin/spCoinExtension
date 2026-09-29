// @ts-nocheck
import { RewardTypeStruct, RewardsStruct } from "../../../dataTypes/spCoinDataTypes";
import { bigIntToDecString } from "../../../utils/dateTime";
import { AGENT, getRewardType, RECIPIENT, SPONSOR } from "../shared";

function buildRewardTypeTotal(rewardType, reward) {
    const rewardTypeRecord = new RewardTypeStruct();
    rewardTypeRecord.TYPE = getRewardType(rewardType);
    rewardTypeRecord.stakingRewards = bigIntToDecString(reward ?? 0);
    rewardTypeRecord.rewardAccountList = [];
    return rewardTypeRecord;
}

export async function getAccountStakingRewards(context, _accountKey) {
    const runtime = context;
    runtime.spCoinLogger.logFunctionHeader("getAccountStakingRewards(" + _accountKey + ")");
    const rewardsRecord = new RewardsStruct();
    const accountRewardsValue = await runtime.spCoinSerialize.getAccountRewardsValue(_accountKey);
    rewardsRecord.sponsorRewardsList = buildRewardTypeTotal(SPONSOR, accountRewardsValue.sponsorRewards ?? 0);
    rewardsRecord.recipientRewardsList = buildRewardTypeTotal(RECIPIENT, accountRewardsValue.recipientRewards ?? 0);
    rewardsRecord.agentRewardsList = buildRewardTypeTotal(AGENT, accountRewardsValue.agentRewards ?? 0);
    runtime.spCoinLogger.logExitFunction();
    return rewardsRecord;
}

