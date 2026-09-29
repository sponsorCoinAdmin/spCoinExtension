// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;
/// @title ERC20 Contract
import "./Agent.sol";

contract AgentRates is Agent {

    constructor() { }

    /// @notice insert recipients Agent
    /// @param _recipientKey public account key to get recipient array
    /// @param _recipientRateKey public account key to get recipient Rate for a given recipient
    /// @param _agentKey new recipient to add to account list 
    function getAgentTransaction(address _sponsor, address _recipientKey, uint _recipientRateKey, address _agentKey, uint _agentRateKey, uint _creationDate)
     internal returns (AgentRateStruct storage) 
    {
        AgentStruct storage agentRecord = getAgent(_sponsor, _recipientKey, _recipientRateKey, _agentKey);
        AgentRateStruct storage agentTransaction = getAgentTransactionByKeys(_sponsor, _recipientKey, _recipientRateKey, _agentKey, _agentRateKey);
        if (!agentTransaction.inserted) {
            validateAgentRateRange(_agentRateKey);
            agentTransaction.agentRate = _agentRateKey;
            agentTransaction.inserted = true;
            agentTransaction.creationTime = _creationDate;
            agentTransaction.lastUpdateTime = _creationDate;
            // agentTransaction.stakedSPCoins = 0;
            agentRecord.agentRateKeys.push(_agentRateKey);
        }
        return agentTransaction;
    }

    function getAgentTransactionByKeys(address _sponsorKey, address _recipientKey, uint _recipientRateKey, address _agentKey, uint _agentRateKey)
    internal view returns (AgentRateStruct storage) {
        AgentStruct storage agentRec = getAgentRecordByKeys(_sponsorKey, _recipientKey, _recipientRateKey, _agentKey) ;
        return agentRec.agentRateMap[_agentRateKey];
    }

    function getAgentTransaction(
        address _sponsorKey,
        address _recipientKey,
        uint256 _recipientRateKey,
        address _agentKey,
        uint256 _agentRateKey
    )
        external
        view
        returns (
            address sponsorKey,
            address recipientKey,
            uint256 recipientRateKey,
            address agentKey,
            uint256 agentRateKey,
            uint256 creationTime,
            uint256 lastUpdateTime,
            uint256 stakedSPCoins,
            bool inserted
        )
    {
        AgentStruct storage agentRecord =
            getAgentRecordByKeys(_sponsorKey, _recipientKey, _recipientRateKey, _agentKey);
        AgentRateStruct storage agentTransaction = agentRecord.agentRateMap[_agentRateKey];
        sponsorKey = agentRecord.sponsorKey == address(0) ? _sponsorKey : agentRecord.sponsorKey;
        recipientKey = agentRecord.recipientKey == address(0) ? _recipientKey : agentRecord.recipientKey;
        recipientRateKey = _recipientRateKey;
        agentKey = agentRecord.agentKey == address(0) ? _agentKey : agentRecord.agentKey;
        agentRateKey = agentTransaction.inserted ? agentTransaction.agentRate : _agentRateKey;
        creationTime = agentTransaction.creationTime;
        lastUpdateTime = agentTransaction.lastUpdateTime;
        stakedSPCoins = agentTransaction.stakedSPCoins;
        inserted = agentTransaction.inserted;
    }


}
