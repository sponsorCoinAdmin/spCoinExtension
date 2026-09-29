// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;
/// @title ERC20 Contract
// import "../accounts/AgentRates.sol";
import "./StakingManager.sol";

contract RewardsManager is StakingManager{

    constructor() {
    }

    // Calculate and update an Account Sopnsor's Reward
    // As a Sponsor account, to get sponsor rewards
    //    1. Get a List of Recipients (_recipientKeys) from recipientAccountList
    //    2.  For Each Recipient (_recipientKey)
    //    3.    Get the RecipientRecord (recipientRec) from the recipientMap
    //    4.      Get a list of RecipientTransactions (recipientTransactions) from RecipientStruct recipientRec
    //    5.        For each recipientRate call function
    //    6.          updateRecipientRateRewards(recipientTransaction, _recipientKey, _transactionTimeStamp);


/*
    function updateAccountStakingRewards( address _sourceKey )
    public returns (uint256 totalRewards) {
        // console.log("SOL 1.0 -------------------------------------------");
        // console.log("SOL 1.1 updateAccountStakingRewards(", toString(_sourceKey), ")");
        AccountStruct storage accountRec = accountMap[_sourceKey];
        uint256 currentTimeStamp = block.timestamp;

        totalRewards += updateRecipientAccountRewards( accountRec, currentTimeStamp);
        // updateAgentAccountRewards( accountRec, currentTimeStamp);
        // console.log("SOL=>1.0 totalRewards = ",totalRewards );
        return totalRewards;
    }

    
    function updateRecipientAccountRewards_OLD( AccountStruct storage accountRec, uint _transactionTimeStamp )
    internal returns (uint256 totalRewards) {
        mapping(address => RecipientStruct) storage recipientMap = accountRec.recipientMap;
        address[] storage recipientKeys = accountRec.recipientAccountList;             // If Sponsor List of Recipient Accounts
        for (uint idx = 0; idx < recipientKeys.length; idx++) {
            address recipientKey = recipientKeys[idx];
            RecipientStruct storage recipientRec = recipientMap[recipientKey];
            mapping(uint256 => RecipientRateStruct) storage recipientRateMap = recipientRec.recipientRateMap;
            uint256[] storage recipientRateList = recipientRec.recipientRateList;
            for (uint rateIdx = 0; rateIdx < recipientRateList.length; rateIdx++) {
                uint recipientRate = recipientRateList[rateIdx];
                RecipientRateStruct storage recipientTransaction = recipientRateMap[recipientRate];
                totalRewards += updateRecipientRateRewards(recipientTransaction, recipientKey, _transactionTimeStamp);
            }
        }
        return totalRewards;
    }
*/

/** To Update an Accounts stacking rewards allocation,  we must update all reward types.
 *  The reward types are 
 *      1. Sponsor Rewards   ~ If account is sponsor
 *      2. Recipient Rewards ~ If account is Recipient
 *      3. Agent Rewards     ~ If account is agent
 *  Note: An account may be any or all of the above types and the accounts total rewards
 *        is the sum of each type.
**/

    function updateAccountStakingRewards( address _sourceKey )
    public returns (uint256 totalRewards) {
        // console.log("SOL 1.0 -------------------------------------------");
        // console.log("SOL 1.1 updateAccountStakingRewards(", toString(_sourceKey), ")");
        uint256 currentTimeStamp = block.timestamp;

        totalRewards += updateSponsorAccountRewards( _sourceKey, currentTimeStamp);
        totalRewards += updateAgentAccountRewards( _sourceKey,   currentTimeStamp);
        totalRewards += updateRecipientAccountRewards( _sourceKey, currentTimeStamp);
        // console.log("SOL=>1.0 totalRewards = ",totalRewards );
        // console.log("SOL 1.4 -------------------------------------------");
        return totalRewards;
    }

    function updateSponsorAccountRewards( address _sourceKey )
    public returns (uint256 totalRewards) {
        // console.log("SOL 1.0 -------------------------------------------");
        // console.log("SOL 1.1 updateAccountStakingRewards(", toString(_sourceKey), ")");
        uint256 currentTimeStamp = block.timestamp;

        totalRewards += updateSponsorAccountRewards( _sourceKey, currentTimeStamp);
        // totalRewards += updateAgentAccountRewards( _sourceKey,   currentTimeStamp);
        // totalRewards += updateRecipientAccountRewards( accountRec, currentTimeStamp);
        // console.log("SOL=>1.0 totalRewards = ",totalRewards );
        // console.log("SOL 1.4 -------------------------------------------");
        return totalRewards;
    }

    function updateAgentAccountRewards( address _sourceKey )
    public returns (uint256 totalRewards) {
        // console.log("SOL 1.0 -------------------------------------------");
        // console.log("SOL 1.1 updateAccountStakingRewards(", toString(_sourceKey), ")");
        uint256 currentTimeStamp = block.timestamp;

        totalRewards += updateAgentAccountRewards( _sourceKey, currentTimeStamp);
        // totalRewards += updateAgentAccountRewards( _sourceKey,   currentTimeStamp);
        // totalRewards += updateRecipientAccountRewards( accountRec, currentTimeStamp);
        // console.log("SOL=>1.0 totalRewards = ",totalRewards );
        // console.log("SOL 1.4 -------------------------------------------");
        return totalRewards;
    }

    function updateRecipietAccountRewards( address _sourceKey )
    public returns (uint256 totalRewards) {
        // console.log("SOL 1.0 -------------------------------------------");
        // console.log("SOL 1.1 updateAccountStakingRewards(", toString(_sourceKey), ")");
        uint256 currentTimeStamp = block.timestamp;

        totalRewards += updateRecipientAccountRewards( _sourceKey, currentTimeStamp);
        // totalRewards += updateAgentAccountRewards( _sourceKey,   currentTimeStamp);
        // totalRewards += updateRecipientAccountRewards( accountRec, currentTimeStamp);
        // console.log("SOL=>1.0 totalRewards = ",totalRewards );
        // console.log("SOL 1.4 -------------------------------------------");
        return totalRewards;
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
    function updateSponsorAccountRewards( address _sponsorKey, uint256 _transactionTimeStamp )
    internal returns (uint256 totalRewards) {
        // console.log("SOL 1.1 updateRecipientAccountRewards(AccountStruct storage accountRec, uint256 _transactionTimeStamp)");
       AccountStruct storage accountRec = accountMap[_sponsorKey];
        mapping(address => RecipientStruct) storage recipientMap = accountRec.recipientMap;
        address[] storage recipientKeys = accountRec.recipientAccountList;             // If Sponsor List of Recipient Accounts
        for (uint idx = 0; idx < recipientKeys.length; idx++) {
            address recipientKey = recipientKeys[idx];
            RecipientStruct storage recipientRecord = recipientMap[recipientKey];
            totalRewards += updateRecipientRateListRewards(recipientRecord, _transactionTimeStamp );
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
    function updateAgentAccountRewards( address agentKey, uint256 _transactionTimeStamp )
    internal returns (uint256 totalRewards) {
        // console.log("SOL 1.1 updateagentAccountipientRewards(AccountStruct storage agentAccount, uint256 _transactionTimeStamp)");
        AccountStruct storage agentAccount = accountMap[agentKey];
        address[] storage parentRecipientKeys = agentAccount.agentParentRecipientAccountList;    // If Recipient List of Recipient Accounts
        for (uint idx = 0; idx < parentRecipientKeys.length; idx++) {
            address parentRecipientKey = parentRecipientKeys[idx];
            AccountStruct storage parentRecipientAccount = accountMap[parentRecipientKey];

            // have agentKey and parentRecipientKey, ToDo: NEED!!! sponsorAccount to get recipientRecord
            // traverse recipients sponsorships, (sponsorAccountList)
            address[] storage sponsorKeys = parentRecipientAccount.sponsorAccountList;
            for (uint keyIdx = 0; keyIdx < sponsorKeys.length; keyIdx++) {
                address sponsorKey = sponsorKeys[keyIdx];
                AccountStruct storage sponsorAccount = accountMap[sponsorKey];
                RecipientStruct storage recipientRecord = sponsorAccount.recipientMap[parentRecipientKey];
                if (recipientRecord.inserted){
                   totalRewards += updateRecipientAgentRewards( recipientRecord, _transactionTimeStamp );
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
    function updateRecipientAccountRewards( address _recipientKey, uint256 _transactionTimeStamp )
    internal returns (uint256 totalRewards) {
        // console.log("SOL 1.1 updateRecipientAccountipientRewards(AccountStruct storage recipientAccount, uint256 _transactionTimeStamp)");
        AccountStruct storage recipientAccount = accountMap[_recipientKey];

            // traverse recipients sponsorships, (sponsorAccountList)
            address[] storage sponsorKeys = recipientAccount.sponsorAccountList;
            for (uint keyIdx = 0; keyIdx < sponsorKeys.length; keyIdx++) {
                address sponsorKey = sponsorKeys[keyIdx];
                AccountStruct storage sponsorAccount = accountMap[sponsorKey];
                RecipientStruct storage recipientRecord = sponsorAccount.recipientMap[_recipientKey];
                if (recipientRecord.inserted){
                    totalRewards += updateRecipientRateListRewards(  recipientRecord, _transactionTimeStamp );
                }
            }
        // console.log("SOL 1.3 totalRewards = ", totalRewards);
        return totalRewards ;
    }

    function updateRecipientAgentRewards( RecipientStruct storage recipientRecord, uint256 _transactionTimeStamp )
    internal returns ( uint rewards ) {
        // console.log("SOL=>7.0 updateRecipientRateListRewards(recipientRecord)");
        uint256[] storage recipientRateList = recipientRecord.recipientRateList;
        mapping(uint256 => RecipientRateStruct) storage recipientRateMap = recipientRecord.recipientRateMap;
        // console.log("SOL=>7.1 updateRecipientRateListRewards:recipientRateList.length = ",recipientRateList.length);
        for (uint idx = 0; idx < recipientRateList.length; idx++) {
            uint256 recipientRate = recipientRateList[idx];
            RecipientRateStruct storage recipientTransaction = recipientRateMap[recipientRate];
            // console.log("SOL=>7.2 updateRecipientRateListRewards:recipientRecord.recipientKey = ", recipientRecord.recipientKey);
            rewards =  updateRecipientRateRewards( recipientTransaction, recipientRecord.recipientKey, _transactionTimeStamp);
            // rewards =  calculateRecipientRateRewards(recipientTransaction, _transactionTimeStamp);
        }
        return rewards ;
    }

    function updateRecipientRateListRewards( RecipientStruct storage recipientRecord, uint256 _transactionTimeStamp )
    internal returns ( uint rewards ) {
        // console.log("SOL=>7.0 updateRecipientRateListRewards(recipientRecord)");
        uint256[] storage recipientRateList = recipientRecord.recipientRateList;
        mapping(uint256 => RecipientRateStruct) storage recipientRateMap = recipientRecord.recipientRateMap;
        // console.log("SOL=>7.1 updateRecipientRateListRewards:recipientRateList.length = ",recipientRateList.length);
        for (uint idx = 0; idx < recipientRateList.length; idx++) {
            uint256 recipientRate = recipientRateList[idx];
            RecipientRateStruct storage recipientTransaction = recipientRateMap[recipientRate];
            // console.log("SOL=>7.2 updateRecipientRateListRewards:recipientRecord.recipientKey = ", recipientRecord.recipientKey);
            rewards =  updateRecipientRateRewards( recipientTransaction, recipientRecord.recipientKey, _transactionTimeStamp);
            // rewards =  calculateRecipientRateRewards(recipientTransaction, _transactionTimeStamp);
        }
        return rewards ;
    }


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    function updateRecipientRateRewards(RecipientRateStruct storage recipientTransaction, address _recipientKey, uint _transactionTimeStamp)
        internal returns (uint totalRewards) {
        // console.log("SOL=>8.0 updateRecipientRateRewards(recipientTransaction, address _recipientKey, uint _transactionTimeStamp");

        uint lastUpdateTime = recipientTransaction.lastUpdateTime;
        uint recipientRate = recipientTransaction.recipientRate;
        // console.log("SOL=>8.1 updateRecipientRateRewards:lastUpdateTime                     = ", lastUpdateTime); 
        // console.log("SOL=>8.2 updateRecipientRateRewards:_transactionTimeStamp              = ", _transactionTimeStamp); 
        // console.log("SOL=>8.3 updateRecipientRateRewards:recipientRate                      = ", recipientRate); 
        // console.log("SOL=>8.4 updateRecipientRateRewards:agentTransaction.stakedSPCoins      = ", stakedSPCoins);
        if ( lastUpdateTime != 0 && lastUpdateTime < _transactionTimeStamp) {
            // console.log("SOL=>8.5 updateRecipientRateRewards:agentTransaction.lastUpdateTime = ", lastUpdateTime);
            // console.log("SOL=>8.6 updateRecipientRateRewards:_transactionTimeStamp          = ", _transactionTimeStamp);
            // console.log("SOL=>8.7 updateRecipientRateRewards:recipientRate                  = ", recipientRate);
            uint recipientRewards = calculateStakingRewards( recipientTransaction.stakedSPCoins, lastUpdateTime, _transactionTimeStamp, recipientTransaction.recipientRate );
            totalRewards += recipientRewards;
            // console.log("SOL=>8.8 updateRecipientRateRewards:Recipient Calculated Reward    = ", recipientRewards);
            depositStakingRewards( RECIPIENT, msg.sender, _recipientKey, recipientRate, burnAddress, 0, recipientRewards);

            updateAgentListRewards(recipientTransaction, _recipientKey, recipientRate, _transactionTimeStamp);
        } 
        recipientTransaction.lastUpdateTime = _transactionTimeStamp;
        return totalRewards;
    }

    function updateAgentListRewards(RecipientRateStruct storage recipientTransaction, address _recipientKey,  uint _recipientRate, uint _transactionTimeStamp)
    internal returns (uint totalRewards) {
        mapping(address => AgentStruct) storage agentMap = recipientTransaction.agentMap;
        address[] storage agentKeys = recipientTransaction.agentAccountList;             // If Sponsor List of Recipient Accounts

        for (uint idx = 0; idx < agentKeys.length; idx++) {
            address agentKey = agentKeys[idx];
            AgentStruct storage agentAccountord = agentMap[agentKey];
            totalRewards += updateAgentRewards(agentAccountord, _recipientKey, _recipientRate, _transactionTimeStamp );
        }
        // console.log("SOL 1.3 totalRewards = ", totalRewards);
        return totalRewards ;

    }

// Note: Need this For Agent Rewards Calculations
   function updateAgentRewards(AgentStruct storage agentAccountord, address _recipientKey,  uint _recipientRate, uint _transactionTimeStamp)
    internal returns (uint totalRewards) {
        mapping(uint256 => AgentRateStruct) storage agentRateMap = agentAccountord.agentRateMap;
        uint256[] storage agentRateKeys = agentAccountord.agentRateList; 
        address agentKey = agentAccountord.agentKey;            // If Sponsor List of Recipient Accounts

        for (uint idx = 0; idx < agentRateKeys.length; idx++) {
            uint agentRateKey = agentRateKeys[idx];
            AgentRateStruct storage agentRateRec = agentRateMap[agentRateKey];
            totalRewards += updateAgentRateRewards(agentRateRec, agentKey, _recipientKey, _recipientRate, _transactionTimeStamp );
        }
        // console.log("SOL 1.3 totalRewards = ", totalRewards);
        return totalRewards;
    }

    function updateAgentRateRewards(AgentRateStruct storage agentTransaction, address _agentKey, address _recipientKey,  uint _recipientRate, uint _transactionTimeStamp)
        internal returns (uint totalRewards) {
        // console.log("updateRecipientRateRewards(agentTransaction, address _recipientKey, uint _transactionTimeStamp");

        uint lastUpdateTime = agentTransaction.lastUpdateTime;
        uint agentRate = agentTransaction.agentRate;
        if ( lastUpdateTime != 0 && lastUpdateTime < _transactionTimeStamp) {
            // console.log("SOL=>3.0 updateAgentRateRewards:agentTransaction.lastUpdateTime = ", lastUpdateTime);
            // console.log("SOL=>3.2 updateAgentRateRewards:_transactionTimeStamp          = ", _transactionTimeStamp);
            // console.log("SOL=>3.3 updateAgentRateRewards:agentRate                      = ", agentRate);
            uint recipientRewards = calculateStakingRewards( agentTransaction.stakedSPCoins, lastUpdateTime, _transactionTimeStamp, agentTransaction.agentRate );
            totalRewards += recipientRewards;
            // console.log("SOL=>3.4 updateAgentRateRewards:recipientRewards               = ", recipientRewards);

            depositStakingRewards( AGENT, msg.sender, _recipientKey, _recipientRate, _agentKey,  agentRate, recipientRewards);
        } 
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
