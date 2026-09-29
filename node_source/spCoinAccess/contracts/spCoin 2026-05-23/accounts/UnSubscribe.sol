// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;
/// @title ERC20 Contract
import "./Transactions.sol";

contract UnSubscribe is Transactions {
    constructor() { }

    function _reduceRateTransactionSetTotal(bytes32 _setKey, uint256 _amount) internal {
        if (_amount == 0) return;
        RateTransactionSetStruct storage rateTransactionSet = rateTransactionSetMap[_setKey];
        if (!rateTransactionSet.inserted) return;
        rateTransactionSet.totalStaked -= _amount;
    }

    function _refundStakeToSponsor(
        address _sponsorKey,
        address _recipientKey,
        uint256 _recipientRateKey,
        address _agentKey,
        uint256 _agentRateKey,
        uint256 _amount
    )
        internal
    {
        if (_amount == 0) return;

        AccountStruct storage sponsorAccount = accountMap[_sponsorKey];
        RecipientStruct storage recipientRecord = sponsorAccount.recipientMap[_recipientKey];
        RecipientRateStruct storage recipientTransaction = recipientRecord.recipientRateMap[_recipientRateKey];

        sponsorAccount.stakedSPCoins -= _amount;
        recipientRecord.stakedSPCoins -= _amount;
        recipientTransaction.stakedSPCoins -= _amount;
        totalStakedSPCoins -= _amount;
        totalUnstakedSpCoins += _amount;
        balanceOf[_sponsorKey] += _amount;

        if (_agentKey == burnAddress) {
            bytes32 recipientSetKey = getRecipientRateTransactionSetKey(_sponsorKey, _recipientKey, _recipientRateKey);
            _reduceRateTransactionSetTotal(recipientSetKey, _amount);
            return;
        }

        AgentStruct storage agentRecord = recipientTransaction.agentMap[_agentKey];
        AgentRateStruct storage agentTransaction = agentRecord.agentRateMap[_agentRateKey];
        agentRecord.stakedSPCoins -= _amount;
        agentTransaction.stakedSPCoins -= _amount;
        bytes32 agentSetKey = getAgentRateTransactionSetKey(
            _sponsorKey,
            _recipientKey,
            _recipientRateKey,
            _agentKey,
            _agentRateKey
        );
        _reduceRateTransactionSetTotal(agentSetKey, _amount);
    }

    function _refundAgentRateStake(
        address _sponsorKey,
        address _recipientKey,
        uint256 _recipientRateKey,
        address _agentKey,
        uint256 _agentRateKey,
        uint256 _refundTimeStamp
    )
        internal
    {
        AgentStruct storage agentRecord =
            getAgentRecordByKeys(_sponsorKey, _recipientKey, _recipientRateKey, _agentKey);
        AgentRateStruct storage agentTransaction = agentRecord.agentRateMap[_agentRateKey];
        if (!agentTransaction.inserted) return;
        _settleAgentRateTransactionSet(
            _sponsorKey,
            _recipientKey,
            _recipientRateKey,
            _agentKey,
            _agentRateKey,
            _refundTimeStamp
        );
        _refundStakeToSponsor(
            _sponsorKey,
            _recipientKey,
            _recipientRateKey,
            _agentKey,
            _agentRateKey,
            agentTransaction.stakedSPCoins
        );
    }

    function _refundAgentStake(
        address _sponsorKey,
        address _recipientKey,
        uint256 _recipientRateKey,
        address _agentKey,
        uint256 _refundTimeStamp
    )
        internal
    {
        AgentStruct storage agentRecord =
            getAgentRecordByKeys(_sponsorKey, _recipientKey, _recipientRateKey, _agentKey);
        while (agentRecord.agentRateKeys.length > 0) {
            uint256 agentRateKey = agentRecord.agentRateKeys[agentRecord.agentRateKeys.length - 1];
            _refundAgentRateStake(
                _sponsorKey,
                _recipientKey,
                _recipientRateKey,
                _agentKey,
                agentRateKey,
                _refundTimeStamp
            );
            agentRecord.agentRateMap[agentRateKey].inserted = false;
            agentRecord.agentRateKeys.pop();
        }
    }

    function _refundRecipientRateStake(
        address _sponsorKey,
        address _recipientKey,
        uint256 _recipientRateKey,
        uint256 _refundTimeStamp
    )
        internal
    {
        RecipientRateStruct storage recipientTransaction =
            getRecipientTransactionByKeys(_sponsorKey, _recipientKey, _recipientRateKey);
        if (!recipientTransaction.inserted) return;

        while (recipientTransaction.agentKeys.length > 0) {
            address agentKey = recipientTransaction.agentKeys[recipientTransaction.agentKeys.length - 1];
            _refundAgentStake(_sponsorKey, _recipientKey, _recipientRateKey, agentKey, _refundTimeStamp);
            AgentStruct storage agentRecord = recipientTransaction.agentMap[agentKey];
            agentRecord.inserted = false;
            deleteAccountRecordFromSearchKeys(agentKey, accountMap[_recipientKey].agentKeys);
            deleteAccountRecordFromSearchKeys(_recipientKey, accountMap[agentKey].parentRecipientKeys);
            recipientTransaction.agentKeys.pop();
        }

        _settleRecipientRateTransactionSet(_sponsorKey, _recipientKey, _recipientRateKey, _refundTimeStamp);
        _refundStakeToSponsor(
            _sponsorKey,
            _recipientKey,
            _recipientRateKey,
            burnAddress,
            0,
            recipientTransaction.stakedSPCoins
        );
    }

    function _refundRecipientStake(address _sponsorKey, address _recipientKey, uint256 _refundTimeStamp)
        internal
    {
        RecipientStruct storage recipientRecord = accountMap[_sponsorKey].recipientMap[_recipientKey];
        while (recipientRecord.recipientRateKeys.length > 0) {
            uint256 recipientRateKey = recipientRecord.recipientRateKeys[recipientRecord.recipientRateKeys.length - 1];
            _refundRecipientRateStake(_sponsorKey, _recipientKey, recipientRateKey, _refundTimeStamp);
            recipientRecord.recipientRateMap[recipientRateKey].inserted = false;
            recipientRecord.recipientRateKeys.pop();
        }
    }

    function deleteSponsor(address _sponsorKey)
        external
        onlyOwnerOrRootAdmin(_sponsorKey)
        accountExists(_sponsorKey)
    {
        uint256 deleteTimeStamp = block.timestamp;
        _settleSponsorRateBuckets(_sponsorKey, deleteTimeStamp);
        AccountStruct storage sponsorAccount = accountMap[_sponsorKey];
        while (sponsorAccount.recipientKeys.length > 0) {
            address recipientKey = sponsorAccount.recipientKeys[sponsorAccount.recipientKeys.length - 1];
            _refundRecipientStake(_sponsorKey, recipientKey, deleteTimeStamp);
            RecipientStruct storage recipientRecord = sponsorAccount.recipientMap[recipientKey];
            recipientRecord.inserted = false;
            deleteAccountRecordFromSearchKeys(_sponsorKey, accountMap[recipientKey].sponsorKeys);
            sponsorAccount.recipientKeys.pop();
        }
        _unlinkSponsorRelationships(_sponsorKey);
    }

    function _settleSponsorRateBuckets(address _sponsorKey, uint256 _deleteTimeStamp)
        internal
        returns (uint256 totalRewards)
    {
        AccountStruct storage sponsorAccount = accountMap[_sponsorKey];
        mapping(address => RecipientStruct) storage recipientMap = sponsorAccount.recipientMap;
        address[] storage recipientKeys = sponsorAccount.recipientKeys;
        for (uint256 idx = 0; idx < recipientKeys.length; idx++) {
            address recipientKey = recipientKeys[idx];
            RecipientStruct storage recipientRecord = recipientMap[recipientKey];
            if (!recipientRecord.inserted) continue;
            totalRewards += updateRecipientRateListRewards(
                _sponsorKey,
                recipientRecord,
                _deleteTimeStamp
            );
        }
    }

    function _unlinkSponsorRelationships(address _sponsorKey) internal {
        AccountStruct storage sponsorAccount = accountMap[_sponsorKey];
        while (sponsorAccount.recipientKeys.length > 0) {
            uint256 recipientIndex = sponsorAccount.recipientKeys.length - 1;
            address recipientKey = sponsorAccount.recipientKeys[recipientIndex];
            RecipientStruct storage recipientRecord = sponsorAccount.recipientMap[recipientKey];
            if (recipientRecord.inserted) {
                _unlinkRecipientRateRelationships(recipientKey, recipientRecord);
                recipientRecord.inserted = false;
            }
            deleteAccountRecordFromSearchKeys(_sponsorKey, accountMap[recipientKey].sponsorKeys);
            sponsorAccount.recipientKeys.pop();
        }
    }

    function _unlinkRecipientRateRelationships(
        address _recipientKey,
        RecipientStruct storage _recipientRecord
    )
        internal
    {
        while (_recipientRecord.recipientRateKeys.length > 0) {
            uint256 rateIndex = _recipientRecord.recipientRateKeys.length - 1;
            uint256 recipientRateKey = _recipientRecord.recipientRateKeys[rateIndex];
            RecipientRateStruct storage recipientTransaction =
                _recipientRecord.recipientRateMap[recipientRateKey];
            if (recipientTransaction.inserted) {
                _unlinkAgentRelationships(_recipientKey, recipientTransaction);
                recipientTransaction.inserted = false;
            }
            _recipientRecord.recipientRateKeys.pop();
        }
    }

    function _unlinkAgentRelationships(
        address _recipientKey,
        RecipientRateStruct storage _recipientTransaction
    )
        internal
    {
        while (_recipientTransaction.agentKeys.length > 0) {
            uint256 agentIndex = _recipientTransaction.agentKeys.length - 1;
            address agentKey = _recipientTransaction.agentKeys[agentIndex];
            AgentStruct storage agentRecord = _recipientTransaction.agentMap[agentKey];
            if (agentRecord.inserted) {
                _unlinkAgentRateRelationships(agentRecord);
                agentRecord.inserted = false;
            }
            deleteAccountRecordFromSearchKeys(agentKey, accountMap[_recipientKey].agentKeys);
            deleteAccountRecordFromSearchKeys(_recipientKey, accountMap[agentKey].parentRecipientKeys);
            _recipientTransaction.agentKeys.pop();
        }
    }

    function _unlinkAgentRateRelationships(AgentStruct storage _agentRecord) internal {
        while (_agentRecord.agentRateKeys.length > 0) {
            uint256 rateIndex = _agentRecord.agentRateKeys.length - 1;
            uint256 agentRateKey = _agentRecord.agentRateKeys[rateIndex];
            AgentRateStruct storage agentTransaction = _agentRecord.agentRateMap[agentRateKey];
            if (agentTransaction.inserted) {
                agentTransaction.inserted = false;
            }
            _agentRecord.agentRateKeys.pop();
        }
    }

    function deleteRecipient(address _sponsorKey, address _recipientKey)
        external
        onlyOwnerOrRootAdmin(_sponsorKey)
        accountExists(_sponsorKey)
        accountExists(_recipientKey)
        nonRedundantRecipient(_sponsorKey, _recipientKey)
    {
        AccountStruct storage sponsorAccount = accountMap[_sponsorKey];
        AccountStruct storage recipientAccount = accountMap[_recipientKey];
        RecipientStruct storage recipientRecord = accountMap[_sponsorKey].recipientMap[_recipientKey];
        if (!recipientRecord.inserted) revert SpCoinError(RECIPIENT_NOT_FOUND);

        _refundRecipientStake(_sponsorKey, _recipientKey, block.timestamp);
        deleteAccountRecordFromSearchKeys(_recipientKey, sponsorAccount.recipientKeys);
        deleteAccountRecordFromSearchKeys(_sponsorKey, recipientAccount.sponsorKeys);
        recipientRecord.inserted = false;
    }

    function deleteRecipientRate(address _sponsorKey, address _recipientKey, uint256 _recipientRateKey)
        public
        onlyOwnerOrRootAdmin(_sponsorKey)
        accountExists(_sponsorKey)
        accountExists(_recipientKey)
        nonRedundantRecipient(_sponsorKey, _recipientKey)
    {
        RecipientStruct storage recipientRecord = accountMap[_sponsorKey].recipientMap[_recipientKey];
        if (!recipientRecord.inserted) revert SpCoinError(RECIPIENT_NOT_FOUND);
        RecipientRateStruct storage recipientTransaction = recipientRecord.recipientRateMap[_recipientRateKey];
        if (!recipientTransaction.inserted) revert SpCoinError(RECIP_RATE_NOT_FOUND);

        _refundRecipientRateStake(_sponsorKey, _recipientKey, _recipientRateKey, block.timestamp);
        deleteUintRecordFromSearchKeys(_recipientRateKey, recipientRecord.recipientRateKeys);
        recipientTransaction.inserted = false;
    }

    function deleteAgent(address _sponsorKey, address _recipientKey, uint256 _recipientRateKey, address _agentKey)
        public
        onlyOwnerOrRootAdmin(_sponsorKey)
        accountExists(_sponsorKey)
        accountExists(_recipientKey)
        accountExists(_agentKey)
    {
        RecipientRateStruct storage recipientTransaction = getRecipientTransactionByKeys(_sponsorKey, _recipientKey, _recipientRateKey);
        AgentStruct storage agentRecord = recipientTransaction.agentMap[_agentKey];
        if (!agentRecord.inserted) revert SpCoinError(AGENT_NOT_FOUND);

        _refundAgentStake(_sponsorKey, _recipientKey, _recipientRateKey, _agentKey, block.timestamp);
        AccountStruct storage agentAccount = accountMap[_agentKey];
        AccountStruct storage recipientAccount = accountMap[_recipientKey];
        deleteAccountRecordFromSearchKeys(_agentKey, recipientTransaction.agentKeys);
        deleteAccountRecordFromSearchKeys(_agentKey, recipientAccount.agentKeys);
        deleteAccountRecordFromSearchKeys(_recipientKey, agentAccount.parentRecipientKeys);
        agentRecord.inserted = false;
    }

    function deleteAgentRate(
        address _sponsorKey,
        address _recipientKey,
        uint256 _recipientRateKey,
        address _agentKey,
        uint256 _agentRateKey
    )
        public
        onlyOwnerOrRootAdmin(_sponsorKey)
        accountExists(_sponsorKey)
        accountExists(_recipientKey)
        accountExists(_agentKey)
    {
        AccountStruct storage sponsorAccount = accountMap[_sponsorKey];
        RecipientStruct storage recipientRecord = sponsorAccount.recipientMap[_recipientKey];
        if (!recipientRecord.inserted) revert SpCoinError(RECIPIENT_NOT_FOUND);

        RecipientRateStruct storage recipientTransaction = recipientRecord.recipientRateMap[_recipientRateKey];
        if (!recipientTransaction.inserted) revert SpCoinError(RECIP_RATE_NOT_FOUND);

        AgentStruct storage agentRecord = recipientTransaction.agentMap[_agentKey];
        if (!agentRecord.inserted) revert SpCoinError(AGENT_NOT_FOUND);

        AgentRateStruct storage agentTransaction = agentRecord.agentRateMap[_agentRateKey];
        if (!agentTransaction.inserted) revert SpCoinError(AGENT_RATE_NOT_FOUND);

        _refundAgentRateStake(_sponsorKey, _recipientKey, _recipientRateKey, _agentKey, _agentRateKey, block.timestamp);
        deleteUintRecordFromSearchKeys(_agentRateKey, agentRecord.agentRateKeys);
        agentTransaction.inserted = false;
    }

 /////////////////// DELETE ACCOUNT METHODS ////////////////////////

    function deleteAccountRecordFromSearchKeys(address _accountKey, 
    address[] storage _accountKeyList) internal returns (bool) {
        // console.log("**** deleteAccountRecordFromSearchKeys ****************************");
        // dumpAccounts("BEFORE", _accountKey, _accountKeyList);
        bool deleted = false;
        uint i = getAccountListIndex (_accountKey, _accountKeyList);
        // delete Found Account Record From Search Keys by searching for the account
        // When Found Delete the account move the last record to the current index location
        // and delete the last element off the end of the accountKeyList with pop().

        // console.log("QQQQQQQ _accountKey", _accountKey);
        // console.log("QQQQQQQ BEFORE _accountKeyList.length", _accountKeyList.length);
        for (i; i<_accountKeyList.length; i++) { 
            if (_accountKeyList[i] == _accountKey) {
                // console.log("==== Found _accountKeyList[", i, "] ", _accountKeyList[i]);
                // console.log("==== Found accountMap[_accountKeyList[", i,  "]].accountKey ", accountMap[_accountKeyList[i]].accountKey);
                delete _accountKeyList[i];
                if (_accountKeyList.length > 0)
                    _accountKeyList[i] = _accountKeyList[_accountKeyList.length - 1];
                _accountKeyList.pop();
// console.log("QQQQQ Deleting",_accountKey, "From account List");
                deleted = true;
                break;
            }
            // console.log("QQQQQQQ AFTER _accountKeyList.length", _accountKeyList.length);
    }
        // dumpAccounts("AFTER", _accountKey, _accountKeyList);
        // console.log("************************************************************");
        return deleted;
    }

    function deleteUintRecordFromSearchKeys(uint256 _searchKey, uint256[] storage _searchList) internal returns (bool) {
        bool deleted = false;
        for (uint i = 0; i < _searchList.length; i++) {
            if (_searchList[i] == _searchKey) {
                delete _searchList[i];
                if (_searchList.length > 0) {
                    _searchList[i] = _searchList[_searchList.length - 1];
                }
                _searchList.pop();
                deleted = true;
                break;
            }
        }
        return deleted;
    }

    function deleteAccountRecord(address _accountKey) external
        accountExists(_accountKey) 
        // ToDo Replace this Removed for space
        onlyOwnerOrRootAdmin(_accountKey)
        sponsorDoesNotExist(_accountKey)
        parentRecipientDoesNotExist(_accountKey)
        recipientDoesNotExist(_accountKey) returns (bool) {
        return !hasActiveLinks(_accountKey);
    }

    modifier sponsorDoesNotExist(address _accountKey) {
        if (
            accountMap[_accountKey].sponsorKeys.length != 0 ||
            accountMap[_accountKey].agentKeys.length != 0
        ) revert SpCoinError(RECIPIENT_HAS_SPONSOR);
            _;
    }
    
    modifier parentRecipientDoesNotExist(address _accountKey) {
        if (accountMap[_accountKey].parentRecipientKeys.length != 0) revert SpCoinError(AGENT_HAS_PARENT);
        _;
    }

    modifier recipientDoesNotExist(address _sponsorKey) {
        if (accountMap[_sponsorKey].recipientKeys.length != 0) revert SpCoinError(SPONSOR_HAS_RECIPIENT);
        _;
    }
/*   
    modifier AgentDoesNotExist(address _accountKey) {
        require (accountMap[_accountKey](_accountKey).length == 0, "Recipient Account has an Agent, (Sponsor must Un-recipient Recipiented Account)");
        _;
    }
*/
}
