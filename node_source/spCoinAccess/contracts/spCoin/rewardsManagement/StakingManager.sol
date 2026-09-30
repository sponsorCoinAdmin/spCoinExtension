// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;
/// @title ERC20 Contract
// import "./RewardsManager.sol";
import "../accounts/AgentRates.sol";

contract StakingManager is AgentRates{
    constructor() {
    }

    function updateAccountRewardTimestamp(uint _accountType, address _accountKey, uint256 _updateTimeStamp)
        internal
    {
        AccountStruct storage accountRec = accountMap[_accountKey];
        if (_accountType == SPONSOR) {
            accountRec.lastSponsorUpdateTimeStamp = _updateTimeStamp;
        } else if (_accountType == RECIPIENT) {
            accountRec.lastRecipientUpdateTimeStamp = _updateTimeStamp;
        } else if (_accountType == AGENT) {
            accountRec.lastAgentUpdateTimeStamp = _updateTimeStamp;
        }
    }

    // Callers (RewardsManager._settleRecipientRateTransactionSet /
    // _settleAgentRateTransactionSet) compute each party's exact share
    // directly and call this once per party — no cascading/re-derivation
    // needed. _sourceKey/_depositKey convention per account type:
    // SPONSOR   ~ _sourceKey = RECIPIENT ADDRESS, _depositKey = SPONSOR ADDRESS
    // RECIPIENT ~ _sourceKey = SPONSOR ADDRESS,   _depositKey = RECIPIENT ADDRESS
    // AGENT     ~ _sourceKey = RECIPIENT ADDRESS, _depositKey = AGENT ADDRESS
    function depositAccountStakingRewards( uint _accountType, address _sourceKey, address _depositKey, uint _rate, uint _amount )
        internal returns ( uint ) {
        // require (_amount > 0, "AMOUNT BALANCE MUST BE LARGER THAN 0");
        // console.log("SOL=>2.0 depositAccountStakingRewards(_accountType)", getAccountTypeString(_accountType));
        // console.log("SOL=>2.1 _sourceKey  = ", _sourceKey);
        // console.log("SOL=>2.2 _depositKey = ", _depositKey);
        // console.log("SOL=>2.3 _rate       = ", _rate);
        // console.log("SOL=>2.4 _amount     = ", _amount);

        // console.log("SOL=>4 FETCHING depositAccount = accountMap[", _depositKey, "]");
        AccountStruct storage depositAccount = accountMap[_depositKey];
        RewardTypeStruct storage rewardsRecord = depositAccount.rewardsMap[getAccountTypeString(_accountType)];

        balanceOf[_depositKey] += _amount;
        totalUnstakedSpCoins += _amount;
        totalSupply += _amount;
        totalStakingRewards += _amount;
        depositAccount.stakingRewards += _amount;
        rewardsRecord.stakingRewards += _amount;
        updateAccountRewardTimestamp(_accountType, _depositKey, block.timestamp);
        // mapping(address => RewardAccountStruct) storage rewardsMap = rewardsRecord.rewardsMap;

        RewardAccountStruct storage rewardAccountRecord;

        rewardAccountRecord = rewardsRecord.rewardsMap[_sourceKey];
        // console.log("SOL=>2.6 rewardsRecord.stakingRewards   = ", rewardsRecord.stakingRewards);
        // console.log("SOL=>2.7 rewardsRecord.stakingRewards = ", rewardsRecord.stakingRewards);
        // console.log("SOL=>2.8 rewardsRecord.stakingRewards     = ", rewardsRecord.stakingRewards);

        rewardAccountRecord.stakingRewards += _amount;

        uint256[] storage rewardRateList = rewardAccountRecord.rewardRateList;
        RewardRateStruct storage rewardTransaction = rewardAccountRecord.rewardRateMap[_rate];
        if (rewardTransaction.rate != _rate) {
            rewardRateList.push(_rate);
            rewardTransaction.rate = _rate;
        }
        // console.log("SOL=>2.9 rewardRateList.length = ",rewardRateList.length);
        // console.log("SOL=>2.10 rewardTransaction.rate = ",rewardTransaction.rate);
        rewardTransaction.stakingRewards += _amount;
        // console.log("SOL=>2.11 rewardTransaction.stakingRewards = ", rewardTransaction.stakingRewards);
        RewardsTransactionStruct[] storage rewardTransactionList = rewardTransaction.rewardTransactionList;
        depositRewardTransaction( rewardTransactionList, _amount );
        // console.log("SOL=>2.12 rewardTransactionList[0].stakingRewards = ", rewardTransactionList[0].stakingRewards);

       return rewardAccountRecord.stakingRewards;
    }

    function depositRewardTransaction(  RewardsTransactionStruct[] storage rewardTransactionList,
                                        uint _amount )  internal {
        // console.log("SOL=>9 depositRewardTransaction("); 
        // console.log("SOL=>10 stakingAccountRecord.stakingRewards = ", stakingAccountRecord.stakingRewards);
        // console.log("SOL=>12               _amount               = ", _amount, ")" );
        // console.log("SOL=>13 BEFORE rewardTransactionList.length = ", rewardTransactionList.length);

        RewardsTransactionStruct memory  rewardsTransactionRecord;
        rewardsTransactionRecord.stakingRewards = _amount;
        rewardsTransactionRecord.updateTime = block.timestamp;
        rewardTransactionList.push(rewardsTransactionRecord);
        // console.log("SOL=>14 AFTER rewardTransactionList.length = ", rewardTransactionList.length);
    }

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    function getAccountRewardTotals(address _accountKey)
        external
        view
        accountExists(_accountKey)
        returns (
            uint256 sponsorRewards,
            uint256 recipientRewards,
            uint256 agentRewards
        )
    {
        AccountStruct storage accountRec = accountMap[_accountKey];
        mapping(string  => RewardTypeStruct) storage rewardsMap = accountRec.rewardsMap;

        sponsorRewards = rewardsMap[getAccountTypeString(SPONSOR)].stakingRewards;
        recipientRewards = rewardsMap[getAccountTypeString(RECIPIENT)].stakingRewards;
        agentRewards = rewardsMap[getAccountTypeString(AGENT)].stakingRewards;
    }

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}
