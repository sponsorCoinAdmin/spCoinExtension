// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;
/// @title ERC20 Contract
// import "../accounts/AgentRates.sol";
import "./StakingManager.sol";

contract RewardsManager is StakingManager{

    constructor() {
    }

    function _getRecipientRateTransactionSetKey(
        address _sponsorKey,
        address _recipientKey,
        uint256 _recipientRateKey
    )
        internal
        pure
        returns (bytes32)
    {
        return keccak256(abi.encode(
            RECIPIENT_RATE_TRANSACTION_SET_DOMAIN,
            _sponsorKey,
            _recipientKey,
            _recipientRateKey
        ));
    }

    function _getAgentRateTransactionSetKey(
        address _sponsorKey,
        address _recipientKey,
        uint256 _recipientRateKey,
        address _agentKey,
        uint256 _agentRateKey
    )
        internal
        pure
        returns (bytes32)
    {
        return keccak256(abi.encode(
            AGENT_RATE_TRANSACTION_SET_DOMAIN,
            _sponsorKey,
            _recipientKey,
            _recipientRateKey,
            _agentKey,
            _agentRateKey
        ));
    }

    function _settleRecipientRateTransactionSet(
        address _sponsorKey,
        address _recipientKey,
        uint256 _recipientRateKey,
        uint256 _updateTimeStamp
    )
        internal
        returns (uint256 rewards)
    {
        bytes32 setKey = _getRecipientRateTransactionSetKey(
            _sponsorKey,
            _recipientKey,
            _recipientRateKey
        );
        RateTransactionSetStruct storage rateTransactionSet = rateTransactionSetMap[setKey];
        if (!rateTransactionSet.inserted || rateTransactionSet.lastUpdateTimeStamp >= _updateTimeStamp) {
            return 0;
        }

        rewards = calculateStakingRewards(
            rateTransactionSet.totalStaked,
            rateTransactionSet.lastUpdateTimeStamp,
            _updateTimeStamp,
            _recipientRateKey
        );

        if (rewards > 0) {
            depositStakingRewards(
                RECIPIENT,
                _sponsorKey,
                _recipientKey,
                _recipientRateKey,
                burnAddress,
                0,
                rewards
            );
        }

        rateTransactionSet.lastUpdateTimeStamp = _updateTimeStamp;
    }

    function _settleAgentRateTransactionSet(
        address _sponsorKey,
        address _recipientKey,
        uint256 _recipientRateKey,
        address _agentKey,
        uint256 _agentRateKey,
        uint256 _updateTimeStamp
    )
        internal
        returns (uint256 rewards)
    {
        bytes32 setKey = _getAgentRateTransactionSetKey(
            _sponsorKey,
            _recipientKey,
            _recipientRateKey,
            _agentKey,
            _agentRateKey
        );
        RateTransactionSetStruct storage rateTransactionSet = rateTransactionSetMap[setKey];
        if (!rateTransactionSet.inserted || rateTransactionSet.lastUpdateTimeStamp >= _updateTimeStamp) {
            return 0;
        }

        // _agentRateKey is a raw 0-100 slider position (ConfigSponsorshipPanel's
        // "Adjust Recipient/Agent Ratio" slider — see the frontend's
        // sponsorRateConfigStore.ts), not a literal percentage. Its intended
        // effective share of the Recipient/Agent pool caps at 10%
        // (sliderRatioRange = agentRateKey/1000, agentPct = recipientAgentPct *
        // sliderRatioRange in deriveSponsorRatePercentages) — e.g. a
        // recipientRateKey of 50 with agentRateKey at its max (100) must
        // yield an effective 5% agent rate (leaving the recipient 45%), not
        // the raw 100% calculateStakingRewards would otherwise apply.
        uint256 effectiveAgentRate = (_recipientRateKey * _agentRateKey) / 1000;

        rewards = calculateStakingRewards(
            rateTransactionSet.totalStaked,
            rateTransactionSet.lastUpdateTimeStamp,
            _updateTimeStamp,
            effectiveAgentRate
        );

        if (rewards > 0) {
            depositStakingRewards(
                AGENT,
                _sponsorKey,
                _recipientKey,
                _recipientRateKey,
                _agentKey,
                effectiveAgentRate,
                rewards
            );
        }

        rateTransactionSet.lastUpdateTimeStamp = _updateTimeStamp;
    }

    // Calculate and update an Account Sopnsor's Reward
    // As a Sponsor account, to get sponsor rewards
    //    1. Get a List of Recipients (_recipientKeys) from recipientAccountList
    //    2.  For Each Recipient (_recipientKey)
    //    3.    Get the RecipientRecord (recipientRec) from the recipientMap
    //    4.      Get a list of RecipientTransactions (recipientTransactions) from RecipientStruct recipientRec
    //    5.        For each recipientRate call function
    //    6.          updateRecipientRateRewards(recipientTransaction, _recipientKey, _transactionTimeStamp);


/** To Update an Accounts stacking rewards allocation,  we must update all reward types.
 *  The reward types are 
 *      1. Sponsor Rewards   ~ If account is sponsor
 *      2. Recipient Rewards ~ If account is Recipient
 *      3. Agent Rewards     ~ If account is agent
 *  Note: An account may be any or all of the above types and the accounts total rewards
 *        is the sum of each type.
**/

    function claimOnChainTotalRewards( address _sourceKey )
    external returns (
        uint256 lastSponsorUpdateTimeStamp,
        uint256 lastRecipientUpdateTimeStamp,
        uint256 lastAgentUpdateTimeStamp,
        uint256 sponsorRewards,
        uint256 recipientRewards,
        uint256 agentRewards,
        uint256 totalRewards
    ) {
        // console.log("SOL 1.0 -------------------------------------------");
        // console.log("SOL 1.1 claimOnChainTotalRewards(", toString(_sourceKey), ")");
        AccountStruct storage accountRec = accountMap[_sourceKey];
        uint256 updateTimeStamp = block.timestamp;

        sponsorRewards = claimSponsorRewardsAt( _sourceKey, updateTimeStamp);
        agentRewards = claimAgentRewardsAt( _sourceKey, updateTimeStamp);
        recipientRewards = claimRecipientRewardsAt( _sourceKey, updateTimeStamp);
        if (accountRec.recipientKeys.length > 0) {
            updateAccountRewardTimestamp(SPONSOR, _sourceKey, updateTimeStamp);
        }
        if (accountRec.sponsorKeys.length > 0) {
            updateAccountRewardTimestamp(RECIPIENT, _sourceKey, updateTimeStamp);
        }
        if (accountRec.parentRecipientKeys.length > 0) {
            updateAccountRewardTimestamp(AGENT, _sourceKey, updateTimeStamp);
        }
        lastSponsorUpdateTimeStamp = accountRec.lastSponsorUpdateTimeStamp;
        lastRecipientUpdateTimeStamp = accountRec.lastRecipientUpdateTimeStamp;
        lastAgentUpdateTimeStamp = accountRec.lastAgentUpdateTimeStamp;
        totalRewards = sponsorRewards + recipientRewards + agentRewards;
        // console.log("SOL=>1.0 totalRewards = ",totalRewards );
        // console.log("SOL 1.4 -------------------------------------------");
        return (
            lastSponsorUpdateTimeStamp,
            lastRecipientUpdateTimeStamp,
            lastAgentUpdateTimeStamp,
            sponsorRewards,
            recipientRewards,
            agentRewards,
            totalRewards
        );
    }

    function claimOnChainSponsorRewards( address _sourceKey )
    external returns (
        uint256 lastSponsorUpdateTimeStamp,
        uint256 sponsorRewards
    ) {
        // console.log("SOL 1.0 -------------------------------------------");
        // console.log("SOL 1.1 claimOnChainSponsorRewards(", toString(_sourceKey), ")");
        AccountStruct storage accountRec = accountMap[_sourceKey];
        uint256 updateTimeStamp = block.timestamp;

        sponsorRewards = claimSponsorRewardsAt( _sourceKey, updateTimeStamp);
        if (accountRec.recipientKeys.length > 0) {
            updateAccountRewardTimestamp(SPONSOR, _sourceKey, updateTimeStamp);
        }
        lastSponsorUpdateTimeStamp = accountRec.lastSponsorUpdateTimeStamp;
        // console.log("SOL=>1.0 totalRewards = ",totalRewards );
        // console.log("SOL 1.4 -------------------------------------------");
        return (lastSponsorUpdateTimeStamp, sponsorRewards);
    }

    function claimOnChainAgentRewards( address _sourceKey )
    external returns (
        uint256 lastAgentUpdateTimeStamp,
        uint256 agentRewards
    ) {
        // console.log("SOL 1.0 -------------------------------------------");
        // console.log("SOL 1.1 claimOnChainAgentRewards(", toString(_sourceKey), ")");
        AccountStruct storage accountRec = accountMap[_sourceKey];
        uint256 updateTimeStamp = block.timestamp;

        agentRewards = claimAgentRewardsAt( _sourceKey, updateTimeStamp);
        if (accountRec.parentRecipientKeys.length > 0) {
            updateAccountRewardTimestamp(AGENT, _sourceKey, updateTimeStamp);
        }
        lastAgentUpdateTimeStamp = accountRec.lastAgentUpdateTimeStamp;
        // console.log("SOL=>1.0 totalRewards = ",totalRewards );
        // console.log("SOL 1.4 -------------------------------------------");
        return (lastAgentUpdateTimeStamp, agentRewards);
    }

    function claimOnChainRecipientRewards( address _sourceKey )
    external returns (
        uint256 lastRecipientUpdateTimeStamp,
        uint256 recipientRewards
    ) {
        // console.log("SOL 1.0 -------------------------------------------");
        // console.log("SOL 1.1 claimOnChainRecipientRewards(", toString(_sourceKey), ")");
        AccountStruct storage accountRec = accountMap[_sourceKey];
        uint256 updateTimeStamp = block.timestamp;

        recipientRewards = claimRecipientRewardsAt( _sourceKey, updateTimeStamp);
        if (accountRec.sponsorKeys.length > 0) {
            updateAccountRewardTimestamp(RECIPIENT, _sourceKey, updateTimeStamp);
        }
        lastRecipientUpdateTimeStamp = accountRec.lastRecipientUpdateTimeStamp;
        // console.log("SOL=>1.0 totalRewards = ",totalRewards );
        // console.log("SOL 1.4 -------------------------------------------");
        return (lastRecipientUpdateTimeStamp, recipientRewards);
    }



/** To Update a Sponsors Account we must complete the following:
 *  1. Get the Recipient Recipients
 *  2. Update the Recipients rewards
 *     The rewards is divided umongst the Recipient And Sponsor.
 *  3. Calculate the recipients portion of the reward
 *  4. When the Recipients rewards are allocated, allocate the remaining reward balance to the Sponsor
 *  Note: Updating the recipients rewards will allocte the remaining balance to the Sponsor
 *  Algorithm:
 *  Calculate and update an Account Sopnsor's Reward
 *  As a Sponsor account, to get sponsor rewards
 *  2.  For Each Recipient (_recipientKey)
 *  3.    Get the RecipientRecord (recipientRec) from the recipientMap
 *  4.      Get a list of RecipientTransactions (recipientTransactions) from RecipientStruct recipientRec
 *  5.        For each recipientRate call function
 *  6.          updateRecipientRateRewards(recipientTransaction, _recipientKey, _transactionTimeStamp);
**/
    function claimSponsorRewardsAt( address _sponsorKey, uint256 _transactionTimeStamp )
    internal returns (uint256 totalRewards) {
        // console.log("SOL 1.1 claimSponsorRewardsAt(address _sponsorKey, uint256 _transactionTimeStamp)");
       AccountStruct storage accountRec = accountMap[_sponsorKey];
        mapping(address => RecipientStruct) storage recipientMap = accountRec.recipientMap;
        address[] storage recipientKeys = accountRec.recipientKeys;             // If Sponsor List of Recipient Accounts
        for (uint idx = 0; idx < recipientKeys.length; idx++) {
            address recipientKey = recipientKeys[idx];
            RecipientStruct storage recipientRecord = recipientMap[recipientKey];
            if (recipientRecord.inserted) {
                totalRewards += updateRecipientRateListRewards(_sponsorKey, recipientRecord, _transactionTimeStamp);
            }
        }
        // console.log("SOL 1.3 totalRewards = ", totalRewards);
        return totalRewards ;
    }

/**
 *  1. For a given Agent Account Key (agentKey), get the Agent Account Record (agentAccount)
 *  2. With the Agent Account Record, get the Parent Recipient keys (parentRecipientKeys)
 *  3. For Each Parent Recipient Account Key, get the Parent Recipient Account (parentRecipientAccount) 
 *  4. With the Parent Recipient Account get the list of Sponsors Keys (sponsorAccountList)
 *  5. For each SponsorKey, get the Sponsor Account, (sponsorAccount).
 *  6. If the Sponsor Account contains an inserted recipient record with key parentRecipientKey then
 *       Update the Recipient's Agent rewards by calling function updateRecipientAgentRewards
**/
    function claimAgentRewardsAt( address agentKey, uint256 _transactionTimeStamp )
    internal returns (uint256 totalRewards) {
        // console.log("SOL 1.1 updateagentAccountipientRewards(AccountStruct storage agentAccount, uint256 _transactionTimeStamp)");
        AccountStruct storage agentAccount = accountMap[agentKey];
        address[] storage parentRecipientKeys = agentAccount.parentRecipientKeys;    // If Recipient List of Recipient Accounts
        for (uint idx = 0; idx < parentRecipientKeys.length; idx++) {
            address parentRecipientKey = parentRecipientKeys[idx];
            AccountStruct storage parentRecipientAccount = accountMap[parentRecipientKey];

            // have agentKey and parentRecipientKey, ToDo: NEED!!! sponsorAccount to get recipientRecord
            // traverse recipients sponsorships, (sponsorAccountList)
            address[] storage sponsorKeys = parentRecipientAccount.sponsorKeys;
            for (uint keyIdx = 0; keyIdx < sponsorKeys.length; keyIdx++) {
                address sponsorKey = sponsorKeys[keyIdx];
                AccountStruct storage sponsorAccount = accountMap[sponsorKey];
                RecipientStruct storage recipientRecord = sponsorAccount.recipientMap[parentRecipientKey];
                if (recipientRecord.inserted){
                   totalRewards += updateRecipientAgentRewards(agentKey, recipientRecord, _transactionTimeStamp);
                }

                // totalRewards += updateRecipientRateListRewards(recipientRecord, _transactionTimeStamp );
            }
        }
        // console.log("SOL 1.3 totalRewards = ", totalRewards);
        return totalRewards ;
    }

/**
* ToDo** To Calculate and Update an Account Recipient's Rewards
*    1. Get a List of Sponsors (_recipientKeys) from agentParentRecipientAccountList
*    2.   For Each Sponsor (_sponsorKey)
*    3.    Get the RecipientRecord (recipientRec) from the recipientMap
*    4.      Get a list of RecipientTransactions (recipientTransactions) from RecipientStruct recipientRec
*    5.        For each recipientRate call function
*    6.          updateRecipientRateRewards(recipientTransaction, _recipientKey, _transactionTimeStamp);
**/
    function claimRecipientRewardsAt( address _recipientKey, uint256 _transactionTimeStamp )
    internal returns (uint256 totalRewards) {
        // console.log("SOL 1.1 updateRecipientAccountipientRewards(AccountStruct storage recipientAccount, uint256 _transactionTimeStamp)");
        AccountStruct storage recipientAccount = accountMap[_recipientKey];

            // traverse recipients sponsorships, (sponsorAccountList)
            address[] storage sponsorKeys = recipientAccount.sponsorKeys;
            for (uint keyIdx = 0; keyIdx < sponsorKeys.length; keyIdx++) {
                address sponsorKey = sponsorKeys[keyIdx];
                AccountStruct storage sponsorAccount = accountMap[sponsorKey];
                RecipientStruct storage recipientRecord = sponsorAccount.recipientMap[_recipientKey];
                if (recipientRecord.inserted){
                    totalRewards += updateRecipientRateListRewards(sponsorKey, recipientRecord, _transactionTimeStamp);
                }
            }
        // console.log("SOL 1.3 totalRewards = ", totalRewards);
        return totalRewards ;
    }

    function updateRecipientAgentRewards(address _agentKey, RecipientStruct storage recipientRecord, uint256 _transactionTimeStamp)
    internal returns ( uint rewards ) {
        // console.log("SOL=>7.0 updateRecipientRateListRewards(recipientRecord)");
        uint256[] storage recipientRateList = recipientRecord.recipientRateKeys;
        mapping(uint256 => RecipientRateStruct) storage recipientRateMap = recipientRecord.recipientRateMap;
        // console.log("SOL=>7.1 updateRecipientRateListRewards:recipientRateList.length = ",recipientRateList.length);
        for (uint idx = 0; idx < recipientRateList.length; idx++) {
            uint256 recipientRate = recipientRateList[idx];
            RecipientRateStruct storage recipientTransaction = recipientRateMap[recipientRate];
            if (!recipientTransaction.inserted) continue;
            AgentStruct storage agentRecord = recipientTransaction.agentMap[_agentKey];
            if (!agentRecord.inserted) continue;
            // console.log("SOL=>7.2 updateRecipientRateListRewards:recipientRecord.recipientKey = ", recipientRecord.recipientKey);
            rewards += updateAgentRewards(
                recipientRecord.sponsorKey,
                agentRecord,
                recipientRecord.recipientKey,
                recipientRate,
                _transactionTimeStamp
            );
            // rewards =  calculateRecipientRateRewards(recipientTransaction, _transactionTimeStamp);
        }
        return rewards ;
    }

    function updateRecipientRateListRewards(address _sponsorKey, RecipientStruct storage recipientRecord, uint256 _transactionTimeStamp)
    internal returns ( uint rewards ) {
        // console.log("SOL=>7.0 updateRecipientRateListRewards(recipientRecord)");
        uint256[] storage recipientRateList = recipientRecord.recipientRateKeys;
        mapping(uint256 => RecipientRateStruct) storage recipientRateMap = recipientRecord.recipientRateMap;
        // console.log("SOL=>7.1 updateRecipientRateListRewards:recipientRateList.length = ",recipientRateList.length);
        for (uint idx = 0; idx < recipientRateList.length; idx++) {
            uint256 recipientRate = recipientRateList[idx];
            RecipientRateStruct storage recipientTransaction = recipientRateMap[recipientRate];
            if (!recipientTransaction.inserted) continue;
            // console.log("SOL=>7.2 updateRecipientRateListRewards:recipientRecord.recipientKey = ", recipientRecord.recipientKey);
            rewards += updateRecipientRateRewards(
                recipientTransaction,
                _sponsorKey,
                recipientRecord.recipientKey,
                _transactionTimeStamp
            );
            rewards += updateAgentListRewards(
                _sponsorKey,
                recipientTransaction,
                recipientRecord.recipientKey,
                recipientRate,
                _transactionTimeStamp
            );
            // rewards =  calculateRecipientRateRewards(recipientTransaction, _transactionTimeStamp);
        }
        return rewards ;
    }


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    function updateRecipientRateRewards(
        RecipientRateStruct storage recipientTransaction,
        address _sponsorKey,
        address _recipientKey,
        uint _transactionTimeStamp
    )
        internal returns (uint totalRewards) {
        // console.log("SOL=>8.0 updateRecipientRateRewards(recipientTransaction, address _recipientKey, uint _transactionTimeStamp");

        uint recipientRate = recipientTransaction.recipientRate;
        // console.log("SOL=>8.1 updateRecipientRateRewards:lastUpdateTime                     = ", lastUpdateTime); 
        // console.log("SOL=>8.2 updateRecipientRateRewards:_transactionTimeStamp              = ", _transactionTimeStamp); 
        // console.log("SOL=>8.3 updateRecipientRateRewards:recipientRate                      = ", recipientRate); 
        // console.log("SOL=>8.4 updateRecipientRateRewards:agentTransaction.stakedSPCoins      = ", stakedSPCoins);
        totalRewards += _settleRecipientRateTransactionSet(
            _sponsorKey,
            _recipientKey,
            recipientRate,
            _transactionTimeStamp
        );
        recipientTransaction.lastUpdateTime = _transactionTimeStamp;
        return totalRewards;
    }

    function updateAgentListRewards(
        address _sponsorKey,
        RecipientRateStruct storage recipientTransaction,
        address _recipientKey,
        uint _recipientRate,
        uint _transactionTimeStamp
    )
    internal returns (uint totalRewards) {
        mapping(address => AgentStruct) storage agentMap = recipientTransaction.agentMap;
        address[] storage agentKeys = recipientTransaction.agentKeys;             // If Sponsor List of Recipient Accounts

        for (uint idx = 0; idx < agentKeys.length; idx++) {
            address agentKey = agentKeys[idx];
            AgentStruct storage agentAccountord = agentMap[agentKey];
            if (agentAccountord.inserted) {
                totalRewards += updateAgentRewards(
                    _sponsorKey,
                    agentAccountord,
                    _recipientKey,
                    _recipientRate,
                    _transactionTimeStamp
                );
            }
        }
        // console.log("SOL 1.3 totalRewards = ", totalRewards);
        return totalRewards ;

    }

// Note: Need this For Agent Rewards Calculations
   function updateAgentRewards(
        address _sponsorKey,
        AgentStruct storage agentAccountord,
        address _recipientKey,
        uint _recipientRate,
        uint _transactionTimeStamp
    )
    internal returns (uint totalRewards) {
        mapping(uint256 => AgentRateStruct) storage agentRateMap = agentAccountord.agentRateMap;
        uint256[] storage agentRateKeys = agentAccountord.agentRateKeys; 
        address agentKey = agentAccountord.agentKey;            // If Sponsor List of Recipient Accounts

        for (uint idx = 0; idx < agentRateKeys.length; idx++) {
            uint agentRateKey = agentRateKeys[idx];
            AgentRateStruct storage agentRateRec = agentRateMap[agentRateKey];
            if (agentRateRec.inserted) {
                totalRewards += updateAgentRateRewards(
                    agentRateRec,
                    _sponsorKey,
                    agentKey,
                    _recipientKey,
                    _recipientRate,
                    _transactionTimeStamp
                );
            }
        }
        // console.log("SOL 1.3 totalRewards = ", totalRewards);
        return totalRewards;
    }

    function updateAgentRateRewards(
        AgentRateStruct storage agentTransaction,
        address _sponsorKey,
        address _agentKey,
        address _recipientKey,
        uint _recipientRate,
        uint _transactionTimeStamp
    )
        internal returns (uint totalRewards) {
        // console.log("updateRecipientRateRewards(agentTransaction, address _recipientKey, uint _transactionTimeStamp");

        uint agentRate = agentTransaction.agentRate;
        totalRewards += _settleAgentRateTransactionSet(
            _sponsorKey,
            _recipientKey,
            _recipientRate,
            _agentKey,
            agentRate,
            _transactionTimeStamp
        );
        agentTransaction.lastUpdateTime = _transactionTimeStamp;
        return totalRewards;
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    
    function calculateRecipientRateRewards( RecipientRateStruct storage _recipientTransaction, uint256 _transactionTimeStamp )
    internal view returns ( uint rewards ) {
        // console.log("calculateRecipientRateRewards( RecipientRateStruct storage _recipientTransaction, uint256 _transactionTimeStamp )");
       return calculateStakingRewards(_recipientTransaction.stakedSPCoins,
                                      _recipientTransaction.lastUpdateTime,
                                      _transactionTimeStamp,
                                      _recipientTransaction.recipientRate);
    }

    function calculateStakingRewards( uint256 _stakedSPCoins, uint256 _lastUpdateTime, uint256 _transactionTimeStamp, uint256 _rate )
    public pure returns (uint rewards) {
        // console.log("SOL=>4.0 calculateStakingRewards:_stakedSPCoins        = ", _stakedSPCoins); 
        // console.log("SOL=>4.1 calculateStakingRewards:_lastUpdateTime       = ", _lastUpdateTime); 
        // console.log("SOL=>4.2 calculateStakingRewards:_transactionTimeStamp = ", _transactionTimeStamp); 
        // console.log("SOL=>4.3 calculateStakingRewards:_rate                 = ", _rate); 
        // console.log("SOL=>4.4 calculateStakingRewards:year                  = ", year); 
        uint256 timeDiff = _lastUpdateTime > _transactionTimeStamp ? 0 : _transactionTimeStamp - _lastUpdateTime;
        // console.log("SOL=>4.5 calculateStakingRewards:timeDiff              = ", timeDiff); 
        uint256 timeRateMultiplier = ( timeDiff * _stakedSPCoins * _rate ) / 100;
        rewards = timeRateMultiplier/year;
        // console.log("SOL=>4.5 calculateStakingRewards:timeRateMultiplier    = ", timeRateMultiplier); 
        // console.log("SOL=>4.6 calculateStakingRewards:rewardsString         = ", rewards); 

        return rewards;
    }

    //////////////////////////////////////////////////////////////////////////////
}
