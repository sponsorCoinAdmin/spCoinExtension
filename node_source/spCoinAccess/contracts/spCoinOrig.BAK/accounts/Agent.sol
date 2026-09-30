// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;
/// @title ERC20 Contract
import "./RecipientRates.sol";

contract Agent is RecipientRates {
        constructor(){  }

    /// @notice insert recipients Agent
    /// @param _recipientKey public account key to get recipient array
    /// @param _agentKey new recipient to add to account list
    function addAgent(address _recipientKey, uint _recipientRateKey, address _agentKey)
            public nonRedundantAgent (_recipientKey, _agentKey) {
        getAgentRecord(msg.sender, _recipientKey, _recipientRateKey, _agentKey);
    }

    /// @notice insert recipients Agent
    /// @param _recipientKey public account key to get recipient array
    /// @param _agentKey new recipient to add to account list
    function getAgentRecord(address _sponsorKey, address _recipientKey, uint _recipientRateKey, address _agentKey)
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
            accountMap[_recipientKey].agentAccountList.push(_agentKey);
            accountMap[_agentKey].agentParentRecipientAccountList.push(_recipientKey);
            recipientTransaction.agentAccountList.push(_agentKey);
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


    /// @notice retreives the recipient array records from a specific account address.
    /// @param _recipientKey recipient Key to retrieve the agent list
    function getRecipientRateAgentList(address _sponsorKey, address _recipientKey, uint256 _recipientRateKey) 
    public view returns (address[] memory) {
        // console.log("============================================================================");
        // console.log("getRecipientRateAgentList(", _sponsorKey, ", ", _recipientKey);
        // console.log(", ", _recipientRateKey,")");
        RecipientRateStruct storage recipientTransaction = getRecipientTransactionByKeys( _sponsorKey, _recipientKey,  _recipientRateKey);
        // console.log("recipientTransaction.inserted = ", recipientTransaction.inserted);
    
        address[] memory agentAccountList = recipientTransaction.agentAccountList;
        // console.log("agentAccountList.length = ", agentAccountList.length);
        // console.log("agentAccountList[0]     = ", agentAccountList[0]);
        // console.log("============================================================================");
        return agentAccountList;
    }

    /// @notice Total Coin Staked Rates Recipiented
    /// @param _recipientKey recipient account key
    /// @param _recipientRateKey recipient rate
    /// @param _agentKey agent record key to be returned
    function getAgentTotalRecipient(address _sponsorKey, address _recipientKey, uint _recipientRateKey, address _agentKey) 
    public view returns (uint) {
        AgentStruct storage agentRec = getAgentRecordByKeys(_sponsorKey, _recipientKey, _recipientRateKey, _agentKey);
        return agentRec.stakedSPCoins; 
    }

    /// @notice retreives the recipient array records from a specific account address.
    /// @param _recipientKey recipient Key to retrieve the agent list
    /// @param _agentKey agent Key to retrieve the agentate list
    function getAgentRateList(address _sponsorKey, address _recipientKey, uint _recipientRateKey, address _agentKey) 
    public view returns (uint[] memory) {
        AgentStruct storage agentRec = getAgentRecordByKeys(_sponsorKey, _recipientKey, _recipientRateKey, _agentKey);
        uint[] memory agentRateList = agentRec.agentRateList;
// console.log("AGENTS.SOL:addAgent:agentRec.agentKey = " , agentRec.agentKey);
// console.log("AGENTS.SOL:getAgentRateList:agentRateList.length = ",agentRateList.length);
        return agentRateList;
    }
}
