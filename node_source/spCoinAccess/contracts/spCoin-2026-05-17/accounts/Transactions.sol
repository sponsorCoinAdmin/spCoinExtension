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
        return _getRecipientRateTransactionSetKey(_sponsorKey, _recipientKey, _recipientRateKey);
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
        return _getAgentRateTransactionSetKey(
            _sponsorKey,
            _recipientKey,
            _recipientRateKey,
            _agentKey,
            _agentRateKey
        );
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

    function _getSponsorContainer(address _sponsorKey)
        internal
        returns (SponsorContainerStruct storage sponsorContainer)
    {
        sponsorContainer = sponsorContainerMap[_sponsorKey];
        if (!sponsorContainer.inserted) {
            sponsorContainer.sponsorKey = _sponsorKey;
            sponsorContainer.inserted = true;
        }
    }

    function _getSponsorRecipientBox(address _sponsorKey, address _recipientKey)
        internal
        returns (SponsorRecipientBoxStruct storage recipientBox)
    {
        SponsorContainerStruct storage sponsorContainer = _getSponsorContainer(_sponsorKey);
        recipientBox = sponsorContainer.recipientBoxMap[_recipientKey];
        if (!recipientBox.inserted) {
            recipientBox.recipientKey = _recipientKey;
            recipientBox.inserted = true;
            sponsorContainer.recipientKeys.push(_recipientKey);
        }
    }

    function _addSponsorRecipientRateTransactionSetKey(
        address _sponsorKey,
        address _recipientKey,
        bytes32 _setKey
    )
        internal
    {
        if (sponsorHasRecipientRateTransactionSetKey[_sponsorKey][_setKey]) return;
        sponsorHasRecipientRateTransactionSetKey[_sponsorKey][_setKey] = true;
        SponsorContainerStruct storage sponsorContainer = _getSponsorContainer(_sponsorKey);
        sponsorContainer.recipientRateTransactionSetKeys.push(_setKey);
        SponsorRecipientBoxStruct storage recipientBox = _getSponsorRecipientBox(_sponsorKey, _recipientKey);
        recipientBox.recipientRateTransactionSetKeys.push(_setKey);
    }

    function _addSponsorAgentRateTransactionSetKey(
        address _sponsorKey,
        address _recipientKey,
        bytes32 _setKey
    )
        internal
    {
        if (sponsorHasAgentRateTransactionSetKey[_sponsorKey][_setKey]) return;
        sponsorHasAgentRateTransactionSetKey[_sponsorKey][_setKey] = true;
        SponsorContainerStruct storage sponsorContainer = _getSponsorContainer(_sponsorKey);
        sponsorContainer.agentRateTransactionSetKeys.push(_setKey);
        SponsorRecipientBoxStruct storage recipientBox = _getSponsorRecipientBox(_sponsorKey, _recipientKey);
        recipientBox.agentRateTransactionSetKeys.push(_setKey);
    }

    function _registerRateTransactionSet(
        bytes32 _setKey,
        uint256 _rate,
        uint256 _transactionId,
        uint256 _stakingRewards,
        uint256 _transactionTimeStamp
    )
        internal
        returns (bool created)
    {
        RateTransactionSetStruct storage rateTransactionSet = rateTransactionSetMap[_setKey];
        if (!rateTransactionSet.inserted) {
            rateTransactionSet.setKey = _setKey;
            rateTransactionSet.rate = _rate;
            rateTransactionSet.creationTimeStamp = _transactionTimeStamp;
            rateTransactionSet.lastUpdateTimeStamp = _transactionTimeStamp;
            rateTransactionSet.inserted = true;
            created = true;
        }
        rateTransactionSet.transactionIds.push(_transactionId);
        rateTransactionSet.transactionCount = rateTransactionSet.transactionIds.length;
        rateTransactionSet.totalStaked += _stakingRewards;
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
        _settleRecipientRateTransactionSet(
            _sponsorKey,
            _recipientKey,
            _recipientRateKey,
            _transRec.insertionTime
        );
        _recipientTransaction.recipientTransactionIdKeys.push(transactionId);
        _recipientTransaction.recipientTransactionSet.transactionCount =
            _recipientTransaction.recipientTransactionIdKeys.length;
        _recipientTransaction.recipientTransactionSet.lastUpdateTransactionDate =
            _transRec.insertionTime;
        _recipientTransaction.recipientTransactionSet.totalStaked +=
            _transRec.stakingRewards;
        bool rateTransactionSetCreated = _registerRateTransactionSet(
            rateTransactionSetKey,
            _recipientRateKey,
            transactionId,
            _transRec.stakingRewards,
            _transRec.insertionTime
        );
        if (rateTransactionSetCreated) {
            _addRecipientRateTransactionSetKey(_recipientKey, rateTransactionSetKey);
            _addSponsorRecipientRateTransactionSetKey(_sponsorKey, _recipientKey, rateTransactionSetKey);
        }

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
        _settleAgentRateTransactionSet(
            _sponsorKey,
            _recipientKey,
            _recipientRateKey,
            _agentKey,
            _agentRateKey,
            _transRec.insertionTime
        );
        _agentTransaction.agentTransactionIdKeys.push(transactionId);
        _agentTransaction.agentTransactionSet.transactionCount =
            _agentTransaction.agentTransactionIdKeys.length;
        _agentTransaction.agentTransactionSet.lastUpdateTransactionDate =
            _transRec.insertionTime;
        _agentTransaction.agentTransactionSet.totalStaked +=
            _transRec.stakingRewards;
        bool rateTransactionSetCreated = _registerRateTransactionSet(
            rateTransactionSetKey,
            _agentRateKey,
            transactionId,
            _transRec.stakingRewards,
            _transRec.insertionTime
        );
        if (rateTransactionSetCreated) {
            _addAgentRateTransactionSetKey(_agentKey, rateTransactionSetKey);
            _addSponsorAgentRateTransactionSetKey(_sponsorKey, _recipientKey, rateTransactionSetKey);
        }

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

    function _getPageLength(uint256 _total, uint256 _offset, uint256 _limit)
        internal
        pure
        returns (uint256)
    {
        if (_offset >= _total || _limit == 0) return 0;
        uint256 remaining = _total - _offset;
        return _limit < remaining ? _limit : remaining;
    }

    function _sliceUint256Array(
        uint256[] storage _source,
        uint256 _offset,
        uint256 _limit
    )
        internal
        view
        returns (uint256[] memory page, uint256 total)
    {
        total = _source.length;
        uint256 pageLength = _getPageLength(total, _offset, _limit);
        page = new uint256[](pageLength);
        for (uint256 i = 0; i < pageLength; i++) {
            page[i] = _source[_offset + i];
        }
    }

    function _sliceBytes32Array(
        bytes32[] storage _source,
        uint256 _offset,
        uint256 _limit
    )
        internal
        view
        returns (bytes32[] memory page, uint256 total)
    {
        total = _source.length;
        uint256 pageLength = _getPageLength(total, _offset, _limit);
        page = new bytes32[](pageLength);
        for (uint256 i = 0; i < pageLength; i++) {
            page[i] = _source[_offset + i];
        }
    }

    function _sliceAddressArray(
        address[] storage _source,
        uint256 _offset,
        uint256 _limit
    )
        internal
        view
        returns (address[] memory page, uint256 total)
    {
        total = _source.length;
        uint256 pageLength = _getPageLength(total, _offset, _limit);
        page = new address[](pageLength);
        for (uint256 i = 0; i < pageLength; i++) {
            page[i] = _source[_offset + i];
        }
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
    }

    function _updateSponsorshipAccountTimestamps(
        address _sponsorKey,
        address _recipientKey,
        address _agentKey,
        uint256 _transactionTimeStamp
    )
        internal
    {
        updateAccountRewardTimestamp(SPONSOR, _sponsorKey, _transactionTimeStamp);
        updateAccountRewardTimestamp(RECIPIENT, _recipientKey, _transactionTimeStamp);
        if (_agentKey != burnAddress) {
            updateAccountRewardTimestamp(AGENT, _agentKey, _transactionTimeStamp);
        }
    }

    function addSponsorship(address _recipientKey,
                                 uint _recipientRateKey,
                                 address _agentKey,
                                 uint _agentRateKey,
                                 uint256 _amount) external
    {
        uint256 transactionTimeStamp = block.timestamp;
        _addSponsorshipForSponsor(
            msg.sender,
            _recipientKey,
            _recipientRateKey,
            _agentKey,
            _agentRateKey,
            _amount,
            transactionTimeStamp
        );
    }

    function addRecipientTransaction(
        address _sponsorKey,
        address _recipientKey,
        uint _recipientRateKey,
        uint256 _amount
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
            _amount,
            block.timestamp
        );
    }

    function addAgentTransaction(
        address _sponsorKey,
        address _recipientKey,
        uint _recipientRateKey,
        address _agentKey,
        uint _agentRateKey,
        uint256 _amount
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
            _amount,
            block.timestamp
        );
    }

    function _addSponsorshipForSponsor(address _sponsorKey,
                                 address _recipientKey, 
                                 uint _recipientRateKey,
                                 address _agentKey,
                                 uint _agentRateKey,
                                 uint256 sponsorAmount,
                                 uint _transactionTimeStamp)
    internal returns (uint256 transactionIndex) {
        // console.log("balanceOf[", msg.sender, "] = ",balanceOf[msg.sender]);
        if (sponsorAmount == 0) revert SpCoinError(AMOUNT_ZERO);
        // string memory errString =
        address payerKey = msg.sender;
        if (balanceOf[payerKey] < sponsorAmount) revert SpCoinError(INSUFFICIENT_BALANCE);


        // validateSufficientAccountBalance(_sponsorCoinQty)
    
        // console.log("msg.sender     ", msg.sender);
        // console.log("addBackDatedSponsorship(");
        // console.log("_recipientKey         = ", _recipientKey, ",");
        // console.log("_recipientRateKey     = ", _recipientRateKey, ",");
        // console.log("_agentKey             = ", _agentKey, ",");
        // console.log("_agentRateKey         = ", _agentRateKey, ",");
        // console.log("sponsorAmount         = ", sponsorAmount, ",");
        // console.log("_transactionTimeStamp = ", _transactionTimeStamp, ")");

        // AccountStruct storage sponsorRec = accountMap[msg.sender];
        StakingTransactionStruct memory transRec;
        transRec.insertionTime = _transactionTimeStamp;
        transRec.stakingRewards = sponsorAmount;
        totalStakedSPCoins += sponsorAmount;

        // console.log( "**** Transaction.sol:ADDING RATE REC = ", _agentRateKey, "ADDING TRANSACTION = ", sponsorAmount);
        if(_agentKey == burnAddress) {
            RecipientRateStruct storage recipientTransaction = getRecipientTransaction(_sponsorKey, _recipientKey, _recipientRateKey, _transactionTimeStamp);
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

        _updateSponsorshipAccountTimestamps(
            _sponsorKey,
            _recipientKey,
            _agentKey,
            _transactionTimeStamp
        );

        // console.log("BEFORE balanceOf     =", balanceOf[msg.sender]);
        // console.log("BEFORE _sponsorCoinQty ", sponsorAmount);
        balanceOf[payerKey] -= sponsorAmount;
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
        RecipientRateStruct storage recipientTransaction = getRecipientTransaction(_sponsorKey, _recipientKey, _recipientRateKey, _transactionTimeStamp);
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
            if (_transactionIndex >= recipientTransaction.transactionList.length) {
                revert SpCoinError(RECIPIENT_TRANSACTION_OOB);
            }
            recipientTransaction.transactionList[_transactionIndex].insertionTime = _transactionTimeStamp;
            _syncRecipientRateTransactionTimestamp(recipientTransaction, _transactionIndex, _transactionTimeStamp);
        } else {
            AgentStruct storage agentRec = getAgentRecordByKeys(_sponsorKey, _recipientKey, _recipientRateKey, _agentKey);
            AgentRateStruct storage agentTransaction = agentRec.agentRateMap[_agentRateKey];
            if (_transactionIndex >= agentTransaction.transactionList.length) {
                revert SpCoinError(AGENT_TRANSACTION_OOB);
            }
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
        if (_transactionIndex >= agentTransaction.transactionList.length) {
            revert SpCoinError(AGENT_TRANSACTION_OOB);
        }
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
        if (_transactionIndex >= recipientTransaction.transactionList.length) {
            revert SpCoinError(RECIPIENT_TRANSACTION_OOB);
        }
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

    function getRecipientRateTransactionSetKeysPage(
        address _recipientKey,
        uint256 _offset,
        uint256 _limit
    )
        external
        view
        returns (bytes32[] memory page, uint256 total)
    {
        return _sliceBytes32Array(
            accountMap[_recipientKey].recipientRateTransactionSetKeys,
            _offset,
            _limit
        );
    }

    function getAgentRateTransactionSetKeys(address _agentKey)
        external
        view
        returns (bytes32[] memory)
    {
        return accountMap[_agentKey].agentRateTransactionSetKeys;
    }

    function getAgentRateTransactionSetKeysPage(
        address _agentKey,
        uint256 _offset,
        uint256 _limit
    )
        external
        view
        returns (bytes32[] memory page, uint256 total)
    {
        return _sliceBytes32Array(
            accountMap[_agentKey].agentRateTransactionSetKeys,
            _offset,
            _limit
        );
    }

    function getSponsorRecipientRateTransactionSetKeys(address _sponsorKey)
        external
        view
        returns (bytes32[] memory)
    {
        return sponsorContainerMap[_sponsorKey].recipientRateTransactionSetKeys;
    }

    function getSponsorRecipientRateTransactionSetKeysPage(
        address _sponsorKey,
        uint256 _offset,
        uint256 _limit
    )
        external
        view
        returns (bytes32[] memory page, uint256 total)
    {
        return _sliceBytes32Array(
            sponsorContainerMap[_sponsorKey].recipientRateTransactionSetKeys,
            _offset,
            _limit
        );
    }

    function getSponsorAgentRateTransactionSetKeys(address _sponsorKey)
        external
        view
        returns (bytes32[] memory)
    {
        return sponsorContainerMap[_sponsorKey].agentRateTransactionSetKeys;
    }

    function getSponsorAgentRateTransactionSetKeysPage(
        address _sponsorKey,
        uint256 _offset,
        uint256 _limit
    )
        external
        view
        returns (bytes32[] memory page, uint256 total)
    {
        return _sliceBytes32Array(
            sponsorContainerMap[_sponsorKey].agentRateTransactionSetKeys,
            _offset,
            _limit
        );
    }

    function getSponsorRateTransactionSetKeys(address _sponsorKey)
        external
        view
        returns (
            bytes32[] memory recipientRateTransactionSetKeys,
            bytes32[] memory agentRateTransactionSetKeys
        )
    {
        SponsorContainerStruct storage sponsorContainer = sponsorContainerMap[_sponsorKey];
        recipientRateTransactionSetKeys = sponsorContainer.recipientRateTransactionSetKeys;
        agentRateTransactionSetKeys = sponsorContainer.agentRateTransactionSetKeys;
    }

    function getSponsorContainerRecipientKeys(address _sponsorKey)
        external
        view
        returns (address[] memory)
    {
        return sponsorContainerMap[_sponsorKey].recipientKeys;
    }

    function getSponsorContainerRecipientKeysPage(
        address _sponsorKey,
        uint256 _offset,
        uint256 _limit
    )
        external
        view
        returns (address[] memory page, uint256 total)
    {
        return _sliceAddressArray(
            sponsorContainerMap[_sponsorKey].recipientKeys,
            _offset,
            _limit
        );
    }

    function getSponsorRecipientRecipientRateTransactionSetKeys(
        address _sponsorKey,
        address _recipientKey
    )
        external
        view
        returns (bytes32[] memory)
    {
        return sponsorContainerMap[_sponsorKey]
            .recipientBoxMap[_recipientKey]
            .recipientRateTransactionSetKeys;
    }

    function getSponsorRecipientRecipientRateTransactionSetKeysPage(
        address _sponsorKey,
        address _recipientKey,
        uint256 _offset,
        uint256 _limit
    )
        external
        view
        returns (bytes32[] memory page, uint256 total)
    {
        return _sliceBytes32Array(
            sponsorContainerMap[_sponsorKey]
                .recipientBoxMap[_recipientKey]
                .recipientRateTransactionSetKeys,
            _offset,
            _limit
        );
    }

    function getSponsorRecipientAgentRateTransactionSetKeys(
        address _sponsorKey,
        address _recipientKey
    )
        external
        view
        returns (bytes32[] memory)
    {
        return sponsorContainerMap[_sponsorKey]
            .recipientBoxMap[_recipientKey]
            .agentRateTransactionSetKeys;
    }

    function getSponsorRecipientAgentRateTransactionSetKeysPage(
        address _sponsorKey,
        address _recipientKey,
        uint256 _offset,
        uint256 _limit
    )
        external
        view
        returns (bytes32[] memory page, uint256 total)
    {
        return _sliceBytes32Array(
            sponsorContainerMap[_sponsorKey]
                .recipientBoxMap[_recipientKey]
                .agentRateTransactionSetKeys,
            _offset,
            _limit
        );
    }

    function getSponsorRecipientRateTransactionSetKeyGroups(
        address _sponsorKey,
        address _recipientKey
    )
        external
        view
        returns (
            bytes32[] memory recipientRateTransactionSetKeys,
            bytes32[] memory agentRateTransactionSetKeys
        )
    {
        SponsorRecipientBoxStruct storage recipientBox =
            sponsorContainerMap[_sponsorKey].recipientBoxMap[_recipientKey];
        recipientRateTransactionSetKeys = recipientBox.recipientRateTransactionSetKeys;
        agentRateTransactionSetKeys = recipientBox.agentRateTransactionSetKeys;
    }

    function getRateTransactionSet(bytes32 _setKey)
        external
        view
        returns (
            bytes32 setKey,
            uint256 rate,
            uint256 creationTimeStamp,
            uint256 lastUpdateTimeStamp,
            uint256 totalStaked,
            uint256 transactionCount,
            bool inserted
        )
    {
        RateTransactionSetStruct storage rateTransactionSet = rateTransactionSetMap[_setKey];
        setKey = rateTransactionSet.setKey;
        rate = rateTransactionSet.rate;
        creationTimeStamp = rateTransactionSet.creationTimeStamp;
        lastUpdateTimeStamp = rateTransactionSet.lastUpdateTimeStamp;
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

    function getRateTransactionSetTransactionIdsPage(
        bytes32 _setKey,
        uint256 _offset,
        uint256 _limit
    )
        external
        view
        returns (uint256[] memory page, uint256 total)
    {
        return _sliceUint256Array(
            rateTransactionSetMap[_setKey].transactionIds,
            _offset,
            _limit
        );
    }

}
