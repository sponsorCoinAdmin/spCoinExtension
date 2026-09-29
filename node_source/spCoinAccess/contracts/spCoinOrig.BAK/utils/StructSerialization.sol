// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "./Utils.sol";

contract StructSerialization is Utils {

    constructor() {}

    string constant delimiter = "\\,";

    function serializedAccount(AccountStruct storage _accountRec)
        internal view returns (string memory)
    {
        string memory addr = concat(
            "accountKey: ",
            toString(_accountRec.accountKey)
        );
        string memory creationTime = concat(
            "creationTime: ",
            toString(_accountRec.creationTime)
        );
        string memory stakingRewards = concat(
            "stakingRewards: ",
            toString(_accountRec.stakingRewards)
        );
        string memory balanceOf = concat(
            "balanceOf: ",
            toString(balanceOf[_accountRec.accountKey])
        );
        // string memory totalBalanceOf = concat(
        //     "totalBalanceOf: ",
        //     toString(totalBalanceOf) 
        // );
        // string memory decimals = concat(
        //     "decimals: ",
        //     toString(_accountRec.decimals)
        // );
        string memory stakedSPCoins = concat(
            "stakedSPCoins: ",
            toString(_accountRec.stakedSPCoins)
        );
        string memory seralized = string(
            abi.encodePacked(
                addr,
                "\\,\n",
                creationTime
            )
        );
        seralized = concat(seralized, delimiter, balanceOf);
        // seralized = concat(seralized, delimiter, totalBalanceOf); 

        seralized = concat(seralized, delimiter, stakedSPCoins);

        string memory sponsorAccountList = toString(_accountRec.sponsorAccountList);
        string memory recipientAccountList = toString(_accountRec.recipientAccountList);
        string memory agentAccountList = toString(_accountRec.agentAccountList);
        string memory agentParentRecipientAccountList = toString(_accountRec.agentParentRecipientAccountList);

        seralized = concat(seralized, delimiter, "sponsorAccountList:",sponsorAccountList);
        seralized = concat(seralized, delimiter, "recipientAccountList:",recipientAccountList);
        seralized = concat(seralized, delimiter, "agentAccountList:", agentAccountList);
        seralized = concat(seralized, delimiter, "agentParentRecipientAccountList:", agentParentRecipientAccountList);
        seralized = concat(seralized, delimiter, stakingRewards);

        return seralized;
    }

    function serializedRewards(AccountStruct storage _accountRec)
        internal view returns (string memory seralized)
    {
        mapping(string  => RewardTypeStruct) storage rewardsMap = _accountRec.rewardsMap;
        RewardTypeStruct storage sponsorRewards = rewardsMap[getAccountTypeString(SPONSOR)];
        RewardTypeStruct storage recipientRewards = rewardsMap[getAccountTypeString(RECIPIENT)];
        RewardTypeStruct storage agentRewards = rewardsMap[getAccountTypeString(AGENT)];

// console.log("==============================================================================================");
// console.log("SOL=>0 serializedAccount(", toString(_accountRec.accountKey),")"); 
// console.log("SOL=>0 toString(sponsorRewards.stakingRewards)", toString(sponsorRewards.stakingRewards)); 
// console.log("SOL=>1 toString(recipientRewards.stakingRewards)", toString(recipientRewards.stakingRewards)); 
// console.log("SOL=>2 toString(agentRewards.stakingRewards)", toString(agentRewards.stakingRewards)); 
        seralized = toString(sponsorRewards.stakingRewards);
        seralized = concat(seralized, ",", toString(recipientRewards.stakingRewards));
        seralized = concat(seralized, ",", toString(agentRewards.stakingRewards));

        return seralized;
    }

    function getSerializedSPCoinHeader()
        public view returns (string memory seralized) {

        seralized = concat(seralized, "NAME:", name);
        seralized = concat(seralized, ",CREATION_TIME:", toString(creationTime));
        seralized = concat(seralized, ",DECIMALS:", toString(decimals));
        seralized = concat(seralized, ",TOTAL_SUPPLY:", toString(totalSupply));
        seralized = concat(seralized, ",INITIAL_TOTAL_SUPPLY:", toString(initialTotalSupply));
        seralized = concat(seralized, ",ANNUAL_INFLATION:", toString(annualInflation));
        seralized = concat(seralized, ",TOTAL_BALANCE_OF:", toString(totalBalanceOf));
        seralized = concat(seralized, ",TOTAL_STAKED_REWARDS:", toString(totalStakingRewards));
        seralized = concat(seralized, ",TOTAL_STAKED_SP_COINS:", toString(totalStakedSPCoins));
        seralized = concat(seralized, ",SYMBOL:", symbol);
        seralized = concat(seralized, ",VERSION:", version);
        return seralized;
    }

        function serializedRewardsTransactionList(RewardsTransactionStruct[] storage _rewardTransactionList)
        internal  view returns (string memory memoryRewards) {
        for (uint idx = 0; idx < _rewardTransactionList.length; idx++) {
            RewardsTransactionStruct storage rewardTransaction = _rewardTransactionList[idx];
            // console.log("SOL6=> rewardTransaction.updateTime     = ", rewardTransaction.updateTime);
            // console.log("SOL7=> rewardTransaction.stakingRewards = ", rewardTransaction.stakingRewards);

            memoryRewards = concat(memoryRewards, toString(rewardTransaction.updateTime));
            memoryRewards = concat(memoryRewards, ",", toString(rewardTransaction.stakingRewards));
            if (idx < _rewardTransactionList.length - 1) {
                memoryRewards = concat(memoryRewards , "\n" );
            }
           // console.log("SOL=>21 getRewardAccounts:Transaction =", memoryRewards);
           // console.log("rewardsRecordList", memoryRewards);
           // console.log("*** END SOL ******************************************************************************");
        }
        return memoryRewards;
    }

    function getSerializedAccountRewards(address _accountKey)
        public view returns (string memory) {
        require(isAccountInserted(_accountKey));
        return serializedRewards(accountMap[_accountKey]);
    }

/*
    function serializedRewards(AccountStruct storage _accountRec)
        internal view returns (string memory)
    {
        mapping(string  => RewardTypeStruct) storage rewardsMap = _accountRec.rewardsMap;
        RewardTypeStruct storage rewards = rewardsMap["RECIPIENT"];

        string memory stakingRewards = concat(
            "stakingRewards: ",
            toString(rewards.stakingRewards)
        );

       string memory stakingRewards = concat(
            "stakingRewards: ",
            toString(rewards.stakingRewards)
        );
       string memory stakingRewards = concat(
            "stakingRewards: ",
            toString(rewards.stakingRewards)
        );
       string memory stakingRewards = concat(
            "stakingRewards: ",
            toString(rewards.stakingRewards)
        );

        string memory seralized = concat("stakingRewards:",stakingRewards); 
        seralized = concat(seralized, delimiter, "stakingRewards:",stakingRewards);
        seralized = concat(seralized, delimiter, "stakingRewards:", stakingRewards);
        seralized = concat(seralized, delimiter, "stakingRewards:", stakingRewards);

        return seralized;
    }
*/

}
