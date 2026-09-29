// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;
/// @title ERC20 Contract
// import "./RewardsManager.sol";
import "../accounts/AgentRates.sol";

contract StakingManager is AgentRates{
    constructor() {
    }

    // SPONSOR   ~ Deposit Sponsor Rewards means as a SPONSOR deposit rewards baser on my source(Recipient)
    //             ~ _sourceKey  = RECIPIENT ADDRESS
    //             ~ _depositKey = SPONSOR ADDRESS
    // RECIPIENT ~ Deposit 
    //             ~ _sourceKey  = SPONSOR ADDRESS
    //             ~ _depositKey = RECIPIENT ADDRESS
    // AGENT     ~ Deposit 
    //             ~ _sourceKey  = RECIPIENT ADDRESS
    //             ~ _depositKey = AGENT ADDRESS

    function depositStakingRewards( uint _accountType, address _sponsorKey,
                                    address _recipientKey, uint _recipientRate,
                                    address _agentKey, uint _agentRate, uint _amount)
        internal returns ( uint ) {
        // console.log(" _accountType, address _sponsorKey, _recipientKey, _recipientRate, _agentKey, _agentRate, _amount");
        // console.log("SOL=>2.1 _accountType   = ", getAccountTypeString(_accountType));
        // console.log("SOL=>2.1 _sponsorKey    = ", _sponsorKey);
        // console.log("SOL=>2.2 _recipientKey  = ", _recipientKey);
        // console.log("SOL=>2.3 _recipientRate = ", _recipientRate);
        // console.log("SOL=>2.4 _agentKey      = ", _agentKey);
        // console.log("SOL=>2.4 _agentRate     = ", _agentRate);
        // console.log("SOL=>2.4 _amount        = ", _amount);

        address sourceKey = _recipientKey;
        address depositKey = _agentKey;
        uint rate = 0;
        uint percentDiviser = decimalMultiplier/100;
        // console.log("decimalMultiplier", decimalMultiplier);
        string memory errMsg = "";

        if (_accountType == SPONSOR) { 
            _recipientRate  = annualInflation;
            errMsg = buildErrString(_accountType, _recipientKey, " NOT FOUND FOR SPONSOR ACCOUNT ",  _sponsorKey);
            require (sponsorHasRecipient( _recipientKey, _sponsorKey ), errMsg);
// console.log("SPONSOR BEFORE _amount",  _amount );
            _amount -= (_amount * annualInflation) / 100;
// console.log("SPONSOR AFTER _amount",  _amount );
            sourceKey = _recipientKey;
            depositKey = _sponsorKey;
            rate = _recipientRate;
         } else if (_accountType == RECIPIENT) { 
             errMsg = buildErrString(_accountType, _recipientKey, " NOT FOUND FOR SPONSOR ACCOUNT ", _sponsorKey);
             require (recipientHasSponsor( _sponsorKey, _recipientKey ), errMsg);
            uint sponsorAmount = ((_amount * decimalMultiplier)/_recipientRate) / percentDiviser;
// console.log("RECIPIENT BEFORE _amount", _amount );
//             _amount -= (_amount * decimalMultiplier) / ( _recipientRate * decimalMultiplier );
// console.log("RECIPIENT AFTER _amount", _amount );
            depositStakingRewards(SPONSOR, _sponsorKey,
                                _recipientKey, _recipientRate,
                                _agentKey, _agentRate, sponsorAmount);
            sourceKey = _sponsorKey;
            depositKey = _recipientKey;   
            rate = _recipientRate;
         } else if (_accountType == AGENT) {
             errMsg = buildErrString(_accountType,  _recipientKey, " NOT FOUND FOR AGENT ACCOUNT ",  _agentKey);
             require (agentHasRecipient( _recipientKey, _agentKey ), errMsg);
            uint recipientAmount = ((_amount * decimalMultiplier)/_agentRate) / percentDiviser;
// console.log("AGENT _amount", _amount );
            depositStakingRewards(RECIPIENT, _sponsorKey,
                                _recipientKey, _recipientRate,
                                _agentKey, _agentRate, recipientAmount);
            sourceKey = _recipientKey;
            depositKey = _agentKey;
            rate = _agentRate;
         }
        return depositAccountStakingRewards( _accountType, sourceKey, depositKey, rate, _amount );
    }

    function buildErrString( uint _accountType, address _key1, string memory str1, address _key2)
    internal view returns(string memory errMsg) {
        errMsg = concat(getAccountTypeString(_accountType), " ACCOUNT ", toString(_key1), str1,  toString(_key2));
        return errMsg;
    }

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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
