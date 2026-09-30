// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;
/// @title ERC20 Contract
import "./RecipientRates.sol";

contract Agent is RecipientRates {
        constructor(){  }

    /// @notice insert recipients Agent
    /// @param _recipientKey public account key to get recipient array
    /// @param _agentKey new recipient to add to account list
    function getAgent(address _sponsorKey, address _recipientKey, uint _recipientRateKey, address _agentKey)
        internal returns (AgentStruct storage) {
        uint currentTimeStamp = block.timestamp;
        AgentStruct storage  agentRecord = getAgentRecordByKeys(_sponsorKey, _recipientKey, _recipientRateKey, _agentKey);
        if (!agentRecord.inserted) {
            RecipientRateStruct storage recipientTransaction = getRecipientTransaction(_sponsorKey, _recipientKey, _recipientRateKey, currentTimeStamp);
            addAccountRecord(AGENT, _agentKey);
            agentRecord.creationTime = currentTimeStamp;
            agentRecord.sponsorKey = _sponsorKey;
            agentRecord.recipientKey = _recipientKey;
            agentRecord.agentKey = _agentKey;
            agentRecord.inserted = true;
            accountMap[_recipientKey].agentKeys.push(_agentKey);
            accountMap[_agentKey].parentRecipientKeys.push(_recipientKey);
            recipientTransaction.agentKeys.push(_agentKey);
        }
        return agentRecord;
    }

    /// @notice Returns Agent record
    /// @param _recipientKey recipient account key
    /// @param _recipientRateKey recipient rate
    /// @param _agentKey agent record key to be returned
    function getAgentRecordByKeys(address _sponsorKey, address _recipientKey, uint _recipientRateKey, address _agentKey)
     internal view returns (AgentStruct storage) {
        RecipientRateStruct storage recipientTransaction = getRecipientTransactionByKeys(_sponsorKey, _recipientKey, _recipientRateKey);
        AgentStruct storage agentRecord = recipientTransaction.agentMap[_agentKey];
        return agentRecord;
     }


    /// @notice retrieves the agent keys for a specific recipient rate.
    /// @param _recipientKey recipient Key to retrieve the agent list
    function getRecipientRateAgentList(address _sponsorKey, address _recipientKey, uint256 _recipientRateKey) 
    external view returns (address[] memory) {
        // console.log("============================================================================");
        // console.log("getRecipientRateAgentList(", _sponsorKey, ", ", _recipientKey);
        // console.log(", ", _recipientRateKey,")");
        RecipientRateStruct storage recipientTransaction = getRecipientTransactionByKeys( _sponsorKey, _recipientKey,  _recipientRateKey);
        // console.log("recipientTransaction.inserted = ", recipientTransaction.inserted);
    
        address[] memory agentKeys = recipientTransaction.agentKeys;
        // console.log("agentKeys.length = ", agentKeys.length);
        // console.log("agentKeys[0]     = ", agentKeys[0]);
        // console.log("============================================================================");
        return agentKeys;
    }

    function getRecipientRateAgentListPage(address _sponsorKey, address _recipientKey, uint256 _recipientRateKey, uint256 offset, uint256 limit)
        external
        view
        returns (address[] memory page, uint256 total)
    {
        RecipientRateStruct storage recipientTransaction = getRecipientTransactionByKeys(_sponsorKey, _recipientKey, _recipientRateKey);
        return _sliceAccountAddressArray(recipientTransaction.agentKeys, offset, limit);
    }

    /// @notice Total Coin Staked Rates Recipiented
    /// @param _recipientKey recipient account key
    /// @param _recipientRateKey recipient rate
    /// @param _agentKey agent record key to be returned
    function getAgentTotalRecipient(address _sponsorKey, address _recipientKey, uint _recipientRateKey, address _agentKey) 
    external view returns (uint) {
        AgentStruct storage agentRec = getAgentRecordByKeys(_sponsorKey, _recipientKey, _recipientRateKey, _agentKey);
        return agentRec.stakedSPCoins; 
    }

    /// @notice retrieves the agent rate keys for a specific agent record.
    /// @param _recipientKey recipient Key to retrieve the agent list
    /// @param _agentKey agent Key to retrieve the agent rate list
    function getAgentRateList(address _sponsorKey, address _recipientKey, uint _recipientRateKey, address _agentKey) 
    external view returns (uint[] memory) {
        AgentStruct storage agentRec = getAgentRecordByKeys(_sponsorKey, _recipientKey, _recipientRateKey, _agentKey);
        uint[] memory agentRateKeys = agentRec.agentRateKeys;
// console.log("AGENTS.SOL:agentRec.agentKey = " , agentRec.agentKey);
// console.log("AGENTS.SOL:getAgentRateList:agentRateKeys.length = ",agentRateKeys.length);
        return agentRateKeys;
    }

    function getAgentRateListPage(address _sponsorKey, address _recipientKey, uint _recipientRateKey, address _agentKey, uint256 offset, uint256 limit)
        external
        view
        returns (uint256[] memory page, uint256 total)
    {
        AgentStruct storage agentRec = getAgentRecordByKeys(_sponsorKey, _recipientKey, _recipientRateKey, _agentKey);
        return _sliceAccountUintArray(agentRec.agentRateKeys, offset, limit);
    }
}
