// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;
/// @title ERC20 Contract
import "./Transactions.sol";

contract UnSubscribe is Transactions {
    constructor() { }

    function deleteSponsor(address _sponsorKey)
        external
        onlyOwnerOrRootAdmin(_sponsorKey)
        accountExists(_sponsorKey)
    {
        delete accountMap[_sponsorKey].recipientKeys;
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
        require(recipientRecord.inserted, "RECIP_NOT_FOUND");

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
        require(recipientRecord.inserted, "RECIP_NOT_FOUND");
        RecipientRateStruct storage recipientTransaction = recipientRecord.recipientRateMap[_recipientRateKey];
        if (!recipientTransaction.inserted) revert SpCoinError(RECIP_RATE_NOT_FOUND);

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
        require(recipientRecord.inserted, "RECIP_NOT_FOUND");

        RecipientRateStruct storage recipientTransaction = recipientRecord.recipientRateMap[_recipientRateKey];
        if (!recipientTransaction.inserted) revert SpCoinError(RECIP_RATE_NOT_FOUND);

        AgentStruct storage agentRecord = recipientTransaction.agentMap[_agentKey];
        if (!agentRecord.inserted) revert SpCoinError(AGENT_NOT_FOUND);

        AgentRateStruct storage agentTransaction = agentRecord.agentRateMap[_agentRateKey];
        if (!agentTransaction.inserted) revert SpCoinError(AGENT_RATE_NOT_FOUND);

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
        require (accountMap[_accountKey].sponsorKeys.length == 0 &&
            accountMap[_accountKey].agentKeys.length == 0, "RECIP_HAS_SPONSOR");
            _;
    }
    
    modifier parentRecipientDoesNotExist(address _accountKey) {
        require (accountMap[_accountKey].parentRecipientKeys.length == 0, "AGENT_HAS_PARENT");
        _;
    }

    modifier recipientDoesNotExist(address _sponsorKey) {
        require (accountMap[_sponsorKey].recipientKeys.length == 0, "SPONSOR_HAS_RECIP");
        _;
    }
/*   
    modifier AgentDoesNotExist(address _accountKey) {
        require (accountMap[_accountKey](_accountKey).length == 0, "Recipient Account has an Agent, (Sponsor must Un-recipient Recipiented Account)");
        _;
    }
*/
}
