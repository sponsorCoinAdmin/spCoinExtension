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

    /// @notice Aggregates one sponsor's entire recipient/rate/agent/agent-rate
    /// tree into a single call. Replaces what would otherwise be
    /// 1 + N + 2*N*M + N*M*K separate round trips (getRecipientKeys, then
    /// getSponsorRecipientRates/getRecipientTransaction/getRecipientRateAgentList
    /// per recipient/rate, then getAgentRateList/getAgentTransaction per
    /// agent/agent-rate) with one eth_call. Read-only; no state changes.
    function getSponsorTree(address _sponsorKey) external view returns (RecipientTreeNode[] memory) {
        address[] memory recipientKeys = accountMap[_sponsorKey].recipientKeys;
        RecipientTreeNode[] memory tree = new RecipientTreeNode[](recipientKeys.length);

        for (uint256 i = 0; i < recipientKeys.length; i++) {
            address recipientKey = recipientKeys[i];
            RecipientStruct storage recipientRecord = getRecipientRecordByKeys(_sponsorKey, recipientKey);
            uint256[] memory rateKeys = recipientRecord.recipientRateKeys;
            RateTreeNode[] memory rateNodes = new RateTreeNode[](rateKeys.length);

            for (uint256 j = 0; j < rateKeys.length; j++) {
                uint256 rateKey = rateKeys[j];
                RecipientRateStruct storage rateRecord = recipientRecord.recipientRateMap[rateKey];
                address[] memory agentKeys = rateRecord.agentKeys;
                AgentTreeNode[] memory agentNodes = new AgentTreeNode[](agentKeys.length);

                for (uint256 k = 0; k < agentKeys.length; k++) {
                    address agentKey = agentKeys[k];
                    AgentStruct storage agentRecord = rateRecord.agentMap[agentKey];
                    uint256[] memory agentRateKeys = agentRecord.agentRateKeys;
                    AgentRateTreeNode[] memory agentRateNodes = new AgentRateTreeNode[](agentRateKeys.length);

                    for (uint256 m = 0; m < agentRateKeys.length; m++) {
                        AgentRateStruct storage agentRateRecord = agentRecord.agentRateMap[agentRateKeys[m]];
                        agentRateNodes[m] = AgentRateTreeNode({
                            agentRateKey: agentRateKeys[m],
                            creationTime: agentRateRecord.creationTime,
                            lastUpdateTime: agentRateRecord.lastUpdateTime,
                            stakedSPCoins: agentRateRecord.stakedSPCoins
                        });
                    }

                    agentNodes[k] = AgentTreeNode({ agentKey: agentKey, rates: agentRateNodes });
                }

                rateNodes[j] = RateTreeNode({
                    recipientRateKey: rateKey,
                    creationTime: rateRecord.creationTime,
                    lastUpdateTime: rateRecord.lastUpdateTime,
                    stakedSPCoins: rateRecord.stakedSPCoins,
                    agents: agentNodes
                });
            }

            tree[i] = RecipientTreeNode({ recipientKey: recipientKey, rates: rateNodes });
        }

        return tree;
    }

}
