// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;
/// @title ERC20 Contract
import "../rewardsManagement/RewardsManager.sol";

contract Transactions is RewardsManager {
    constructor() { }

    function getRecipientRateTransactionSetKey(
        address _sponsorKey,
        address _recipientKey,
        uint256 _recipientRateKey
    )
        public
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

    function getAgentRateTransactionSetKey(
        address _sponsorKey,
        address _recipientKey,
        uint256 _recipientRateKey,
        address _agentKey,
        uint256 _agentRateKey
    )
        public
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

    function _addRecipientRateTransactionSetKey(address _recipientKey, bytes32 _setKey) internal {
        if (accountHasRecipientRateTransactionSetKey[_recipientKey][_setKey]) return;
        accountHasRecipientRateTransactionSetKey[_recipientKey][_setKey] = true;
        accountMap[_recipientKey].recipientRateTransactionSetKeys.push(_setKey);
    }

    function _addAgentRateTransactionSetKey(address _agentKey, bytes32 _setKey) internal {
        if (accountHasAgentRateTransactionSetKey[_agentKey][_setKey]) return;
        accountHasAgentRateTransactionSetKey[_agentKey][_setKey] = true;
        accountMap[_agentKey].agentRateTransactionSetKeys.push(_setKey);
    }

    function _registerRateTransactionSet(
        bytes32 _setKey,
        uint256 _rate,
        uint256 _transactionId,
        uint256 _stakingRewards,
        uint256 _transactionTimeStamp
    )
        internal
    {
        RateTransactionSetStruct storage rateTransactionSet = rateTransactionSetMap[_setKey];
        if (!rateTransactionSet.inserted) {
            rateTransactionSet.setKey = _setKey;
            rateTransactionSet.rate = _rate;
            rateTransactionSet.inserted = true;
        }
        rateTransactionSet.transactionIds.push(_transactionId);
        rateTransactionSet.transactionCount = rateTransactionSet.transactionIds.length;
        rateTransactionSet.totalStaked += _stakingRewards;
        rateTransactionSet.lastUpdateTransactionDate = _transactionTimeStamp;
    }

    function _registerRecipientRateTransaction(
        RecipientRateStruct storage _recipientTransaction,
        address _sponsorKey,
        address _recipientKey,
        uint256 _recipientRateKey,
        StakingTransactionStruct memory _transRec
    )
        internal
        returns (uint256 transactionId)
    {
        transactionId = reserveTransactionId();
        bytes32 rateTransactionSetKey =
            getRecipientRateTransactionSetKey(_sponsorKey, _recipientKey, _recipientRateKey);
        _recipientTransaction.recipientTransactionIdKeys.push(transactionId);
        _recipientTransaction.recipientTransactionSet.transactionCount =
            _recipientTransaction.recipientTransactionIdKeys.length;
        _recipientTransaction.recipientTransactionSet.lastUpdateTransactionDate =
            _transRec.insertionTime;
        _recipientTransaction.recipientTransactionSet.totalStaked +=
            _transRec.stakingRewards;
        _addRecipientRateTransactionSetKey(_recipientKey, rateTransactionSetKey);
        _registerRateTransactionSet(
            rateTransactionSetKey,
            _recipientRateKey,
            transactionId,
            _transRec.stakingRewards,
            _transRec.insertionTime
        );

        TransactionRecordStruct storage transactionRecord = masterTransactionIdMap[transactionId];
        transactionRecord.transactionId = transactionId;
        transactionRecord.insertionTime = _transRec.insertionTime;
        transactionRecord.stakingRewards = _transRec.stakingRewards;
        transactionRecord.sponsorKey = _sponsorKey;
        transactionRecord.recipientKey = _recipientKey;
        transactionRecord.recipientRateKey = _recipientRateKey;
        transactionRecord.agentKey = burnAddress;
        transactionRecord.agentRateKey = 0;
        transactionRecord.inserted = true;
        emit TransactionAdded(
            transactionId,
            _sponsorKey,
            _recipientKey,
            burnAddress,
            rateTransactionSetKey,
            _recipientRateKey,
            0,
            _transRec.stakingRewards
        );
    }

    function _registerAgentRateTransaction(
        AgentRateStruct storage _agentTransaction,
        address _sponsorKey,
        address _recipientKey,
        uint256 _recipientRateKey,
        address _agentKey,
        uint256 _agentRateKey,
        StakingTransactionStruct memory _transRec
    )
        internal
        returns (uint256 transactionId)
    {
        transactionId = reserveTransactionId();
        bytes32 rateTransactionSetKey = getAgentRateTransactionSetKey(
            _sponsorKey,
            _recipientKey,
            _recipientRateKey,
            _agentKey,
            _agentRateKey
        );
        _agentTransaction.agentTransactionIdKeys.push(transactionId);
        _agentTransaction.agentTransactionSet.transactionCount =
            _agentTransaction.agentTransactionIdKeys.length;
        _agentTransaction.agentTransactionSet.lastUpdateTransactionDate =
            _transRec.insertionTime;
        _agentTransaction.agentTransactionSet.totalStaked +=
            _transRec.stakingRewards;
        _addAgentRateTransactionSetKey(_agentKey, rateTransactionSetKey);
        _registerRateTransactionSet(
            rateTransactionSetKey,
            _agentRateKey,
            transactionId,
            _transRec.stakingRewards,
            _transRec.insertionTime
        );

        TransactionRecordStruct storage transactionRecord = masterTransactionIdMap[transactionId];
        transactionRecord.transactionId = transactionId;
        transactionRecord.insertionTime = _transRec.insertionTime;
        transactionRecord.stakingRewards = _transRec.stakingRewards;
        transactionRecord.sponsorKey = _sponsorKey;
        transactionRecord.recipientKey = _recipientKey;
        transactionRecord.recipientRateKey = _recipientRateKey;
        transactionRecord.agentKey = _agentKey;
        transactionRecord.agentRateKey = _agentRateKey;
        transactionRecord.inserted = true;
        emit TransactionAdded(
            transactionId,
            _sponsorKey,
            _recipientKey,
            _agentKey,
            rateTransactionSetKey,
            _recipientRateKey,
            _agentRateKey,
            _transRec.stakingRewards
        );
    }

    function _syncRecipientRateTransactionTimestamp(
        RecipientRateStruct storage _recipientTransaction,
        uint256 _transactionIndex,
        uint256 _transactionTimeStamp
    )
        internal
    {
        if (_transactionIndex >= _recipientTransaction.recipientTransactionIdKeys.length) return;
        uint256 transactionId = _recipientTransaction.recipientTransactionIdKeys[_transactionIndex];
        if (transactionId == 0) return;
        TransactionRecordStruct storage transactionRecord = masterTransactionIdMap[transactionId];
        if (!transactionRecord.inserted) return;
        transactionRecord.insertionTime = _transactionTimeStamp;
        _recipientTransaction.recipientTransactionSet.lastUpdateTransactionDate = _transactionTimeStamp;
        bytes32 rateTransactionSetKey = getRecipientRateTransactionSetKey(
            transactionRecord.sponsorKey,
            transactionRecord.recipientKey,
            transactionRecord.recipientRateKey
        );
        rateTransactionSetMap[rateTransactionSetKey].lastUpdateTransactionDate = _transactionTimeStamp;
    }

    function _syncAgentRateTransactionTimestamp(
        AgentRateStruct storage _agentTransaction,
        uint256 _transactionIndex,
        uint256 _transactionTimeStamp
    )
        internal
    {
        if (_transactionIndex >= _agentTransaction.agentTransactionIdKeys.length) return;
        uint256 transactionId = _agentTransaction.agentTransactionIdKeys[_transactionIndex];
        if (transactionId == 0) return;
        TransactionRecordStruct storage transactionRecord = masterTransactionIdMap[transactionId];
        if (!transactionRecord.inserted) return;
        transactionRecord.insertionTime = _transactionTimeStamp;
        _agentTransaction.agentTransactionSet.lastUpdateTransactionDate = _transactionTimeStamp;
        bytes32 rateTransactionSetKey = getAgentRateTransactionSetKey(
            transactionRecord.sponsorKey,
            transactionRecord.recipientKey,
            transactionRecord.recipientRateKey,
            transactionRecord.agentKey,
            transactionRecord.agentRateKey
        );
        rateTransactionSetMap[rateTransactionSetKey].lastUpdateTransactionDate = _transactionTimeStamp;
    }

    function addSponsorship(address _recipientKey,
                                 uint _recipientRateKey,
                                 address _agentKey,
                                 uint _agentRateKey,
                                 string calldata _strWholeAmount,
                                 string calldata _strDecimalAmount) external
    {
        uint256 transactionTimeStamp = block.timestamp;
        _addSponsorshipForSponsor(
            msg.sender,
            _recipientKey,
            _recipientRateKey,
            _agentKey,
            _agentRateKey,
            _strWholeAmount,
            _strDecimalAmount,
            transactionTimeStamp
        );
    }

    function addRecipientTransaction(
        address _sponsorKey,
        address _recipientKey,
        uint _recipientRateKey,
        string calldata _strWholeAmount,
        string calldata _strDecimalAmount
    )
        external
        onlyOwnerOrRootAdmin(_sponsorKey)
        returns (uint256 transactionIndex)
    {
        return _addSponsorshipForSponsor(
            _sponsorKey,
            _recipientKey,
            _recipientRateKey,
            burnAddress,
            0,
            _strWholeAmount,
            _strDecimalAmount,
            block.timestamp
        );
    }

    function addAgentTransaction(
        address _sponsorKey,
        address _recipientKey,
        uint _recipientRateKey,
        address _agentKey,
        uint _agentRateKey,
        string calldata _strWholeAmount,
        string calldata _strDecimalAmount
    )
        external
        onlyOwnerOrRootAdmin(_sponsorKey)
        returns (uint256 transactionIndex)
    {
        return _addSponsorshipForSponsor(
            _sponsorKey,
            _recipientKey,
            _recipientRateKey,
            _agentKey,
            _agentRateKey,
            _strWholeAmount,
            _strDecimalAmount,
            block.timestamp
        );
    }

    function _addSponsorshipForSponsor(address _sponsorKey,
                                 address _recipientKey, 
                                 uint _recipientRateKey,
                                 address _agentKey,
                                 uint _agentRateKey,
                                 string memory _strWholeAmount,
                                 string memory _strDecimalAmount,
                                 uint _transactionTimeStamp)
    internal returns (uint256 transactionIndex) {
        // console.log("balanceOf[", msg.sender, "] = ",balanceOf[msg.sender]);
        uint256 sponsorAmount;
        bool result;
        (sponsorAmount, result) = decimalStringToUint(_strWholeAmount, _strDecimalAmount, decimals);

        require(result, "AMOUNT_PARSE");
        // string memory errString =
        require(balanceOf[_sponsorKey] >= sponsorAmount, 
            "INSUFFICIENT_BAL");


        // validateSufficientAccountBalance(_sponsorCoinQty)
    
        // console.log("msg.sender     ", msg.sender);
        // console.log("addBackDatedSponsorship(");
        // console.log("_recipientKey         = ", _recipientKey, ",");
        // console.log("_recipientRateKey     = ", _recipientRateKey, ",");
        // console.log("_agentKey             = ", _agentKey, ",");
        // console.log("_agentRateKey         = ", _agentRateKey, ",");
        // console.log("strWholeAmount        = ", _strWholeAmount, ",");
        // console.log("_strDecimalAmount     = ", _strDecimalAmount, ",");
        // console.log("_transactionTimeStamp = ", _transactionTimeStamp, ")");

        // AccountStruct storage sponsorRec = accountMap[msg.sender];
        StakingTransactionStruct memory transRec;
        transRec.insertionTime = _transactionTimeStamp;
        transRec.stakingRewards = sponsorAmount;
        totalStakedSPCoins += sponsorAmount;

        // console.log( "**** Transaction.sol:ADDING RATE REC = ", _agentRateKey, "ADDING TRANSACTION = ", sponsorAmount);
        if(_agentKey == burnAddress) {
            RecipientRateStruct storage recipientTransaction = getRecipientTransaction(_sponsorKey, _recipientKey, _recipientRateKey, _transactionTimeStamp);
            updateRecipientRateRewards( recipientTransaction, _recipientKey, _transactionTimeStamp);
            updateRecipientRateSponsorship(_sponsorKey, recipientTransaction, _recipientKey, sponsorAmount, _transactionTimeStamp);
            transactionIndex = recipientTransaction.transactionList.length;
            recipientTransaction.transactionList.push(transRec);
            _registerRecipientRateTransaction(
                recipientTransaction,
                _sponsorKey,
                _recipientKey,
                _recipientRateKey,
                transRec
            );
        }
        else {
            AgentRateStruct storage agentTransaction = getAgentTransaction(_sponsorKey, _recipientKey, _recipientRateKey, _agentKey, _agentRateKey, _transactionTimeStamp);
            updateAgentRateRewards(agentTransaction, _agentKey, _recipientKey,  _recipientRateKey, _transactionTimeStamp);

            updateAgentRateSponsorship(_sponsorKey, agentTransaction, _recipientKey, _recipientRateKey, _agentKey, sponsorAmount, _transactionTimeStamp);
            transactionIndex = agentTransaction.transactionList.length;
            agentTransaction.transactionList.push(transRec);
            _registerAgentRateTransaction(
                agentTransaction,
                _sponsorKey,
                _recipientKey,
                _recipientRateKey,
                _agentKey,
                _agentRateKey,
                transRec
            );
        }

        // console.log("BEFORE balanceOf     =", balanceOf[msg.sender]);
        // console.log("BEFORE _sponsorCoinQty ", sponsorAmount);
        balanceOf[_sponsorKey] -= sponsorAmount;
        totalUnstakedSpCoins -= sponsorAmount;
        // console.log("AFTER balanceOf     =", balanceOf[msg.sender]);
        // console.log("AFTER _sponsorCoinQty ", sponsorAmount);
    }

    function updateRecipientRateSponsorship(address _sponsorKey, RecipientRateStruct storage recipientTransaction, address _recipientKey, 
    uint256 _sponsorCoinQty , uint _transactionTimeStamp)
        internal returns (RecipientRateStruct storage) {
        // console.log("updateRecipientRateSponsorship:_sponsorCoinQty = ", _sponsorCoinQty, _transactionTimeStamp);
        updateRecipientSponsorship(_sponsorKey, _recipientKey, _sponsorCoinQty);
        uint lastUpdateTime = recipientTransaction.lastUpdateTime;
        if ( lastUpdateTime != _transactionTimeStamp) {
            recipientTransaction.lastUpdateTime = _transactionTimeStamp;
            // uint agentRewards = calculateStakingRewards( _sponsorCoinQty, lastUpdateTime, _transactionTimeStamp, _recipientRateKey );
            // console.log("RRRRRRRRRRRRRRRRRRRRRRRRRRR _sponsorCoinQty                = ", _sponsorCoinQty);
            // console.log("RRRRRRRRRRRRRRRRRRRRRRRRRRR agentTransaction.lastUpdateTime = ", lastUpdateTime);
            // console.log("RRRRRRRRRRRRRRRRRRRRRRRRRRR _transactionTimeStamp          = ", _transactionTimeStamp);
            // console.log("RRRRRRRRRRRRRRRRRRRRRRRRRRR _recipientRateKey              = ", _recipientRateKey);
            // console.log("RRRRRRRRRRRRRRRRRRRRRRRRRRR Agent Calculated Rewards       = ", agentRewards);
        }
        recipientTransaction.stakedSPCoins += _sponsorCoinQty;
        return recipientTransaction;
    }

    function updateAgentRateSponsorship(address _sponsorKey, AgentRateStruct storage agentTransaction, address _recipientKey,
    uint _recipientRateKey, address _agentKey, uint256 _sponsorCoinQty, uint _transactionTimeStamp)
       internal returns (AgentRateStruct storage) {
       updateAgentSponsorship(_sponsorKey, _recipientKey, _recipientRateKey, _agentKey, _sponsorCoinQty, _transactionTimeStamp);
        uint lastUpdateTime = agentTransaction.lastUpdateTime;
        if ( lastUpdateTime != _transactionTimeStamp) {
            agentTransaction.lastUpdateTime = _transactionTimeStamp;
            // uint agentRewards = calculateStakingRewards( _sponsorCoinQty, lastUpdateTime, _transactionTimeStamp, _recipientRateKey );
            // console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAA _sponsorCoinQty                = ", _sponsorCoinQty);
            // console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAA agentTransaction.lastUpdateTime = ", lastUpdateTime);
            // console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAA _transactionTimeStamp          = ", _transactionTimeStamp);
            // console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAA _recipientRateKey              = ", _recipientRateKey);
            // console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAA Agent Calculated Rewards       = ", agentRewards);
        }
        agentTransaction.stakedSPCoins += _sponsorCoinQty;
        return agentTransaction;
    }

    function updateAgentSponsorship(address _sponsorKey, address _recipientKey, uint _recipientRateKey, address _agentKey, uint256 _sponsorCoinQty, uint _transactionTimeStamp)
       internal returns (AgentStruct storage) {
        RecipientRateStruct storage recipientTransaction = getRecipientTransaction(_sponsorKey, _recipientKey, _recipientRateKey, block.timestamp);
        updateRecipientRateSponsorship(_sponsorKey, recipientTransaction, _recipientKey, _sponsorCoinQty, _transactionTimeStamp);
        AgentStruct storage agentRecord = recipientTransaction.agentMap[_agentKey];
        agentRecord.stakedSPCoins += _sponsorCoinQty;
        return agentRecord;
    }

    function updateRecipientSponsorship(address _sponsorKey, address _recipientKey, uint256 _sponsorCoinQty)
        internal returns (RecipientStruct storage) {
        // console.log("updateRecipientSponsorship(", _sponsorCoinQty, ")");

        AccountStruct storage sponsorRec = updateSponsorTransaction(_sponsorKey, _sponsorCoinQty);
        RecipientStruct storage recipientRecord = sponsorRec.recipientMap[_recipientKey];
        // RecipientStruct storage recipientRecord = getRecipientRecord(msg.sender, _recipientKey);
        // console.log("BEFORE updateRecipientSponsorship:recipientRecord.stakedSPCoins", recipientRecord.stakedSPCoins );
        recipientRecord.stakedSPCoins += _sponsorCoinQty;
        // console.log("AFTER updateRecipientSponsorship:recipientRecord.stakedSPCoins", recipientRecord.stakedSPCoins );
        return recipientRecord;
    }

    function updateSponsorTransaction(address _sponsorKey, uint256 _sponsorCoinQty)
       internal returns (AccountStruct storage) {
        AccountStruct storage sponsorRec = accountMap[_sponsorKey];
        sponsorRec.stakedSPCoins += _sponsorCoinQty;
        return sponsorRec;
    }

    function backDateTransaction(
        address _sponsorKey,
        address _recipientKey,
        uint256 _recipientRateKey,
        address _agentKey,
        uint256 _agentRateKey,
        uint256 _transactionIndex,
        uint256 _transactionTimeStamp
    )
        external
        onlyRootAdmin
    {
        if (_agentKey == burnAddress) {
            RecipientRateStruct storage recipientTransaction =
                getRecipientTransactionByKeys(_sponsorKey, _recipientKey, _recipientRateKey);
            require(_transactionIndex < recipientTransaction.transactionList.length, "RECIP_TX_OOB");
            recipientTransaction.transactionList[_transactionIndex].insertionTime = _transactionTimeStamp;
            _syncRecipientRateTransactionTimestamp(recipientTransaction, _transactionIndex, _transactionTimeStamp);
        } else {
            AgentStruct storage agentRec = getAgentRecordByKeys(_sponsorKey, _recipientKey, _recipientRateKey, _agentKey);
            AgentRateStruct storage agentTransaction = agentRec.agentRateMap[_agentRateKey];
            require(_transactionIndex < agentTransaction.transactionList.length, "AGENT_TX_OOB");
            agentTransaction.transactionList[_transactionIndex].insertionTime = _transactionTimeStamp;
            _syncAgentRateTransactionTimestamp(agentTransaction, _transactionIndex, _transactionTimeStamp);
        }
    }

    function getAgentTransactionCount(
        address _sponsorKey,
        address _recipientKey,
        uint256 _recipientRateKey,
        address _agentKey,
        uint256 _agentRateKey
    )
        external
        view
        returns (uint256)
    {
        AgentStruct storage agentRec = getAgentRecordByKeys(_sponsorKey, _recipientKey, _recipientRateKey, _agentKey);
        AgentRateStruct storage agentTransaction = agentRec.agentRateMap[_agentRateKey];
        return agentTransaction.transactionList.length;
    }

    function getRecipientTransactionCount(
        address _sponsorKey,
        address _recipientKey,
        uint256 _recipientRateKey
    )
        external
        view
        returns (uint256)
    {
        RecipientRateStruct storage recipientTransaction =
            getRecipientTransactionByKeys(_sponsorKey, _recipientKey, _recipientRateKey);
        return recipientTransaction.transactionList.length;
    }

    function getAgentTransactionAt(
        address _sponsorKey,
        address _recipientKey,
        uint256 _recipientRateKey,
        address _agentKey,
        uint256 _agentRateKey,
        uint256 _transactionIndex
    )
        external
        view
        returns (
            uint256 insertionTime,
            uint256 stakingRewards
        )
    {
        AgentStruct storage agentRec = getAgentRecordByKeys(_sponsorKey, _recipientKey, _recipientRateKey, _agentKey);
        AgentRateStruct storage agentTransaction = agentRec.agentRateMap[_agentRateKey];
        require(_transactionIndex < agentTransaction.transactionList.length, "AGENT_TX_OOB");
        StakingTransactionStruct storage transactionRecord = agentTransaction.transactionList[_transactionIndex];
        insertionTime = transactionRecord.insertionTime;
        stakingRewards = transactionRecord.stakingRewards;
    }

    function getRecipientTransactionAt(
        address _sponsorKey,
        address _recipientKey,
        uint256 _recipientRateKey,
        uint256 _transactionIndex
    )
        external
        view
        returns (
            uint256 insertionTime,
            uint256 stakingRewards
        )
    {
        RecipientRateStruct storage recipientTransaction =
            getRecipientTransactionByKeys(_sponsorKey, _recipientKey, _recipientRateKey);
        require(_transactionIndex < recipientTransaction.transactionList.length, "RECIP_TX_OOB");
        StakingTransactionStruct storage transactionRecord = recipientTransaction.transactionList[_transactionIndex];
        insertionTime = transactionRecord.insertionTime;
        stakingRewards = transactionRecord.stakingRewards;
    }

    function getTransactionRecord(uint256 _transactionId)
        external
        view
        returns (
            uint256 transactionId,
            uint256 insertionTime,
            uint256 stakingRewards,
            address sponsorKey,
            address recipientKey,
            uint256 recipientRateKey,
            address agentKey,
            uint256 agentRateKey,
            bool inserted
        )
    {
        TransactionRecordStruct storage transactionRecord = masterTransactionIdMap[_transactionId];
        transactionId = transactionRecord.transactionId;
        insertionTime = transactionRecord.insertionTime;
        stakingRewards = transactionRecord.stakingRewards;
        sponsorKey = transactionRecord.sponsorKey;
        recipientKey = transactionRecord.recipientKey;
        recipientRateKey = transactionRecord.recipientRateKey;
        agentKey = transactionRecord.agentKey;
        agentRateKey = transactionRecord.agentRateKey;
        inserted = transactionRecord.inserted;
    }

    function getRecipientTransactionIdKeys(
        address _sponsorKey,
        address _recipientKey,
        uint256 _recipientRateKey
    )
        external
        view
        returns (uint256[] memory)
    {
        RecipientRateStruct storage recipientTransaction =
            getRecipientTransactionByKeys(_sponsorKey, _recipientKey, _recipientRateKey);
        return recipientTransaction.recipientTransactionIdKeys;
    }

    function getAgentTransactionIdKeys(
        address _sponsorKey,
        address _recipientKey,
        uint256 _recipientRateKey,
        address _agentKey,
        uint256 _agentRateKey
    )
        external
        view
        returns (uint256[] memory)
    {
        AgentStruct storage agentRec = getAgentRecordByKeys(_sponsorKey, _recipientKey, _recipientRateKey, _agentKey);
        AgentRateStruct storage agentTransaction = agentRec.agentRateMap[_agentRateKey];
        return agentTransaction.agentTransactionIdKeys;
    }

    function getRecipientRateTransactionSetKeys(address _recipientKey)
        external
        view
        returns (bytes32[] memory)
    {
        return accountMap[_recipientKey].recipientRateTransactionSetKeys;
    }

    function getAgentRateTransactionSetKeys(address _agentKey)
        external
        view
        returns (bytes32[] memory)
    {
        return accountMap[_agentKey].agentRateTransactionSetKeys;
    }

    function getRateTransactionSet(bytes32 _setKey)
        external
        view
        returns (
            bytes32 setKey,
            uint256 rate,
            uint256 lastUpdateTransactionDate,
            uint256 totalStaked,
            uint256 transactionCount,
            bool inserted
        )
    {
        RateTransactionSetStruct storage rateTransactionSet = rateTransactionSetMap[_setKey];
        setKey = rateTransactionSet.setKey;
        rate = rateTransactionSet.rate;
        lastUpdateTransactionDate = rateTransactionSet.lastUpdateTransactionDate;
        totalStaked = rateTransactionSet.totalStaked;
        transactionCount = rateTransactionSet.transactionCount;
        inserted = rateTransactionSet.inserted;
    }

    function getRateTransactionSetTransactionIds(bytes32 _setKey)
        external
        view
        returns (uint256[] memory)
    {
        return rateTransactionSetMap[_setKey].transactionIds;
    }

}
