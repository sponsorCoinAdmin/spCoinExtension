// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;
/// @title ERC20 Contract
import "./Transactions.sol";

contract UnSubscribe is Transactions {
    constructor() { }

    /// @notice Remove all recipientship relationships for Sponsor and Recipient accounts
    /// @param _recipientKey Recipient to be removed from the Recipient relationship
    function unSponsorRecipient(address _recipientKey)  
        // ToDo Replace this Removed for space
        onlyOwnerOrRootAdmin("unSponsorRecipient", msg.sender)
        public 
        accountExists(msg.sender)
        accountExists(_recipientKey)
        nonRedundantRecipient (msg.sender, _recipientKey) {
// console.log("UN-SPONSOR FROM ACCOUNT", msg.sender, "FOR RECIPIANT",_recipientKey); 
 
        // Clean up Sponsor References and Balances
        // Move Recipient's steaked Coins back to Sponsors BalanceOf
        AccountStruct storage sponsorAccount = accountMap[msg.sender];
        // Remove Sponsors reference to Recipient in recipientAccountList
        // console.log("DELETE RECIPIENT KEY",_recipientKey, "FROM SPONSOR ACCOUNT",sponsorAccount.accountKey);
        if (deleteAccountRecordFromSearchKeys(_recipientKey, sponsorAccount.recipientAccountList)) {

            RecipientStruct storage recipientRecord = sponsorAccount.recipientMap[_recipientKey];
            uint256 totalSponsored = recipientRecord.stakedSPCoins;
            // console.log("UnSubscribe:BEFORE balanceOf() msg.sender = ", balanceOf[msg.sender]);
            // console.log("UnSubscribe:BEFORE totalSponsored         = ", totalSponsored);
            totalStakedSPCoins -= totalSponsored;
            totalBalanceOf += totalSponsored;
            balanceOf[sponsorAccount.accountKey] += totalSponsored;
            sponsorAccount.stakedSPCoins -= totalSponsored;
            // ToDo: Robin Here
            // console.log("UnSubscribe:BEFORE balanceOf[",msg.sender,"]", balanceOf[msg.sender]);
            // balanceOf[msg.sender] += totalSponsored;
            // totalBalanceOf += totalSponsored;
            // console.log("UnSubscribe:AFTER  balanceOf[",msg.sender,"]", balanceOf[msg.sender]);

            // Delete Recipient and Clean up Recipient's References
            // console.log("UnSubscribe:AFTER unSponsorRecipient() msg.sender = ", msg.sender);
            // console.log("UnSubscribe:AFTER balanceOf() msg.sender = ", balanceOf[msg.sender]);
            // console.log("unSponsorRecipient(", totalSponsored, ")");
            unSponsorRecipient(recipientRecord);
        }
    }

    function unSponsorRecipient(RecipientStruct storage recipientRecord)  
    internal {
        address recipientKey = recipientRecord.recipientKey;
        AccountStruct storage recipientAccount = accountMap[recipientKey];
        // console.log("DELETE SPONSOR KEY",recipientRecord.sponsorKey, "FROM RECIPIANT ACCOUNT LIST", recipientAccount.accountKey);
        deleteAccountRecordFromSearchKeys(recipientRecord.sponsorKey, recipientAccount.sponsorAccountList);
        deleteRecipientTransactions(recipientRecord);

     }

    // For each Recipient Rate Transaction,
    //   Remove Agent Account Reference from Rate Transaction
    function deleteRecipientTransactions(RecipientStruct storage _recipientRecord) internal {
        // Delete Agent Rate Keys
        uint256[] storage recipientRateList = _recipientRecord.recipientRateList;
        uint i = recipientRateList.length - 1;
        // Traverse Recipient Rate Transactions for removal of Recipiant Rate Transactions
        for (i; i >= 0; i--) {
            // console.log("====deleteRecipientTransactions: recipientRateList[", i, "] ", recipientRateList[i]);
            uint256 recipientRateKey = recipientRateList[i];
            deleteRecipientTransaction(_recipientRecord.recipientRateMap[recipientRateKey]);
            delete recipientRateList[i];
            recipientRateList.pop();
            if (i == 0)
              break;
        }
    }

    function deleteRecipientTransaction(RecipientRateStruct storage recipientTransaction)
    internal {
        address[] storage agentAccountList = recipientTransaction.agentAccountList;

        // console.log(agentAccountList);

        if ( agentAccountList.length > 0 ) {
            uint i = agentAccountList.length - 1;
            // Traverse Recipient Rate Transactions for removal of Recipiant Rate Transactions
            for (i; i >= 0; i--) {
                address agentKey = recipientTransaction.agentAccountList[i];
                AgentStruct storage agentRecord = recipientTransaction.agentMap[agentKey];
                deleteAgentRecord(agentRecord);
                deleteTransactionRecords(recipientTransaction.transactionList);
                agentAccountList.pop();
                if (i == 0)
                    break;
            }
        }
    }

    function deleteAgentRecord(AgentStruct storage _agentRecord) internal {
        address agentKey = _agentRecord.agentKey;
        address recipientKey = _agentRecord.recipientKey;
        AccountStruct storage agentAccount = accountMap[agentKey];
        AccountStruct storage recipientAccount = accountMap[recipientKey];
        
        // ToDo Delete Sponsor Account List
        deleteAgentTransaction (_agentRecord);

        // console.log("ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ");
        // console.log("DELETING from agentAccount.agentParentRecipientAccountList recipientKey", _agentRecord.recipientKey);
        // console.log("SPONSOR   =" , _agentRecord.sponsorKey);
        // console.log("RECIPIENT =" , _agentRecord.recipientKey);
        // console.log("AGENT     =" , agentKey);
        // console.log("-------------------------------------------------------------------------------------------------------------------");
        // for (uint j = 0; j < agentAccount.agentParentRecipientAccountList.length ; j++)
        // console.log("*** BEFORE DELETE agentAccount.agentParentRecipientAccountList[", j, "] = ",agentAccount.agentParentRecipientAccountList[j]); 
        // console.log("deleteAccountRecordFromSearchKeys(",_agentRecord.recipientKey, agentAccount.accountKey,")");
        deleteAccountRecordFromSearchKeys(_agentRecord.recipientKey, agentAccount.agentParentRecipientAccountList);

        // Delete Reference Agent Key From Recipient.agentAccountList
        deleteAccountRecordFromSearchKeys(agentKey, recipientAccount.agentAccountList );
        deleteAccountFromMaster(recipientKey);

        // console.log("ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ");

        // for (uint j = 0; j < agentAccount.agentParentRecipientAccountList.length ; j++)
        // console.log("*** AFTER DELETE agentAccount.agentParentRecipientAccountList[", j, "] = ",agentAccount.agentParentRecipientAccountList[j]);
         deleteAccountFromMaster(agentKey);
    }

    function deleteAgentTransaction (AgentStruct storage agentRecord) internal {
        uint256[] storage agentRateList = agentRecord.agentRateList;
        // console.log("### BEFORE Delete agentRecord.agentRateList.length = ", agentRecord.agentRateList.length);
        uint i = agentRateList.length - 1;
        // Delete the agent Rate Structures one by one until empty.
        for (i; i >= 0; i--) {
            // console.log("====deleteAgentTransaction: Found agentRateList[", i, "] ", agentRateList[i]);
            uint256 agentRateKey = agentRateList[i];
            AgentRateStruct storage agentTransaction = agentRecord.agentRateMap[agentRateKey];
            deleteTransactionRecords(agentTransaction.transactionList);
            agentRateList.pop();
            if (i == 0)
              break;
        }
        // delete the Agent Account Record if no References
    }

    // Delete ageny rate list.
    function deleteTransactionRecords(StakingTransactionStruct[] storage transactionList) internal {
        for (uint i= 0; i< transactionList.length; i++) { 
            // console.log("====deleteTransactionRecords: Deleting transactionList[", i, "].quantity ", transactionList[i].quantity);
            delete transactionList[i];
            transactionList.pop();
        }
        // delete agentTransaction;
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

    function deleteAccountFromMaster(address _accountKey) 
    public returns (bool){
        // console.log("XXXXXXXXXXXXXXXXXXXX deleteAccountFromMaster(",_accountKey,") XXXXXXXXXXXXXXXXXXXX");
        // console.log("accountMap[",_accountKey,"].sponsorAccountList.length =", accountMap[_accountKey].sponsorAccountList.length);
        // console.log("accountMap[",_accountKey,"].recipientAccountList.length =", accountMap[_accountKey].recipientAccountList.length);
        // console.log("accountMap[",_accountKey,"].agentAccountList.length =", accountMap[_accountKey].agentAccountList.length);
        // console.log("accountMap[",_accountKey,"].agentParentRecipientAccountList.length =", accountMap[_accountKey].agentParentRecipientAccountList.length);
        // console.log("****balanceOf[",accountMap[_accountKey].accountKey,"] =", balanceOf[accountMap[_accountKey].accountKey]);

        if(accountMap[_accountKey].sponsorAccountList.length == 0 &&
            accountMap[_accountKey].recipientAccountList.length == 0 &&
            accountMap[_accountKey].agentAccountList.length == 0 &&
            accountMap[_accountKey].agentParentRecipientAccountList.length == 0 &&
            balanceOf[accountMap[_accountKey].accountKey] == 0) {
            // console.log("*** DELETING ACCOUNT ", _accountKey);
            if (deleteAccountRecordFromSearchKeys(_accountKey,  masterAccountList)) {
                delete accountMap[_accountKey];
                // console.log("TRUE XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX");
                return true;
            } 
        }
        // console.log("FALSE XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX");
        return false;
    }


    function deleteAccountRecord(address _accountKey) public
        accountExists(_accountKey) 
        // ToDo Replace this Removed for space
        onlyOwnerOrRootAdmin("deleteAccountRecord", _accountKey)
        sponsorDoesNotExist(_accountKey)
        parentRecipientDoesNotExist(_accountKey)
        recipientDoesNotExist(_accountKey) 
        balanceOfIsEmpty(_accountKey) returns (bool) {
        if (deleteAccountRecordFromSearchKeys( _accountKey,  masterAccountList)) {
            delete accountMap[_accountKey];
            return true;
        }
        return false;
    }

    modifier sponsorDoesNotExist(address _accountKey) {
        require (accountMap[_accountKey].sponsorAccountList.length == 0 &&
            accountMap[_accountKey].agentAccountList.length == 0, "Recipient Account has a Sponsor, (Sponsor must Un-recipient Recipiented Account)");
            _;
    }
    
    modifier balanceOfIsEmpty(address _accountKey) {
        require (balanceOf[accountMap[_accountKey].accountKey] == 0, "Agent Account has a Parent Recipient, (Sponsor must Un-recipient Recipiented Account)");
        _;
    }

    modifier parentRecipientDoesNotExist(address _accountKey) {
        require (accountMap[_accountKey].agentParentRecipientAccountList.length == 0, "Agent Account has a Parent Recipient, (Sponsor must Un-recipient Recipiented Account)");
        _;
    }

    modifier recipientDoesNotExist(address _sponsorKey) {
        require (getAccountRecipientList(_sponsorKey).length == 0, "Sponsor Account has a Recipient, (Sponsor must Un-recipient Recipiented Account)");
        _;
    }
/*   
    modifier AgentDoesNotExist(address _accountKey) {
        require (accountMap[_accountKey](_accountKey).length == 0, "Recipient Account has an Agent, (Sponsor must Un-recipient Recipiented Account)");
        _;
    }
*/
}
