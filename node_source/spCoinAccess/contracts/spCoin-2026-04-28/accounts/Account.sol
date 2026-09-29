// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;
/// @title ERC20 Contract
import "../utils///StructSerialization.sol";

contract Account is StructSerialization {
    constructor() {}

    /// @notice insert block chain network address for spCoin Management
    /// @param _accountKey public accountKey to set new balance
    function addAccountRecord(uint accountType, address _accountKey)
        internal {
        AccountStruct storage accountRec = accountMap[_accountKey];
        if (!accountRec.inserted) {
            // console.log("addAccountRecord(", accountType, _accountKey, ")");
            accountRec.accountKey = _accountKey;
            accountRec.creationTime = block.timestamp;
            // accountRec.decimals = decimals;
            accountRec.stakedSPCoins = 0;
            accountRec.inserted = true;
            masterAccountList.push(_accountKey);
        }
        accountRec.accountTypes |= accountType;
    }

    function hasActiveLinks(address _accountKey) internal view returns (bool) {
        AccountStruct storage accountRec = accountMap[_accountKey];
        return accountRec.sponsorKeys.length > 0 ||
            accountRec.recipientKeys.length > 0 ||
            accountRec.agentKeys.length > 0 ||
            accountRec.parentRecipientKeys.length > 0;
    }

    function getAccountRecord(uint accountType, address account)
        internal returns (AccountStruct storage accountRecord) {
            addAccountRecord(accountType, account);
            return accountMap[account];
    }

    function getInternalAccount(address _accountKey)
        internal
        view
        returns (bool inserted, AccountStruct storage accountRecord)
    {
        accountRecord = accountMap[_accountKey];
        inserted = accountRecord.inserted;
    }

    function sponsorHasRecipient(address _recipientAccount, address _sponsorAccount )
        internal view returns ( bool ) {
        AccountStruct storage recipientAccount = accountMap[_recipientAccount];
        address[] storage sponsorKeys = recipientAccount.sponsorKeys;
        return accountInList( _sponsorAccount, sponsorKeys );
    }

    function recipientHasSponsor(address _sponsorAccount, address _recipientAccount )
        internal view returns ( bool ) {
        AccountStruct storage recipientAccount = accountMap[_recipientAccount];
        address[] storage sponsorKeys = recipientAccount.sponsorKeys;
        return accountInList( _sponsorAccount, sponsorKeys );
    }

    function agentHasRecipient(address _recipientAccount, address _agentAccount )
        internal view returns ( bool ) {
        AccountStruct storage recipientAccount = accountMap[_recipientAccount];
        address[] storage agentKeys = recipientAccount.agentKeys;
        return accountInList( _agentAccount, agentKeys );
    }

    function accountInList(address _sourceAccount, address[] storage searchList )
        internal view returns ( bool ) {
        bool sponsorFound = false;

        for (uint idx = 0; idx < searchList.length; idx++) {
        if ( _sourceAccount == searchList[idx] )
            sponsorFound = true;
        }
        return sponsorFound;
    }
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /// @notice retrieves account graph summary metadata.
    function getMasterAccountMetaData()
        external
        view
        returns (
            uint256 masterAccountSize,
            uint256 activeAccountCount,
            uint256 inactiveAccountCount,
            uint256 totalSponsorLinks,
            uint256 totalRecipientLinks,
            uint256 totalAgentLinks,
            uint256 totalParentRecipientLinks
        )
    {
        masterAccountSize = masterAccountList.length;
        for (uint256 idx = 0; idx < masterAccountList.length; idx++) {
            address accountKey = masterAccountList[idx];
            AccountStruct storage accountRec = accountMap[accountKey];
            if (hasActiveLinks(accountKey)) {
                activeAccountCount += 1;
            } else {
                inactiveAccountCount += 1;
            }
            totalSponsorLinks += accountRec.sponsorKeys.length;
            totalRecipientLinks += accountRec.recipientKeys.length;
            totalAgentLinks += accountRec.agentKeys.length;
            totalParentRecipientLinks += accountRec.parentRecipientKeys.length;
        }
    }

    /// @notice retrieves the inserted master account keys.
    function getMasterAccountKeys() external view returns (address[] memory) {
        return masterAccountList;
    }

    function getMasterAccountKeyAt(uint256 index) external view returns (address) {
        return masterAccountList[index];
    }

    function isAccountActive(address _accountKey) external view returns (bool) {
        return hasActiveLinks(_accountKey);
    }

    function accountHasActiveLinks(address _accountKey) external view returns (bool) {
        return hasActiveLinks(_accountKey);
    }

    function getAccountCore(address _accountKey)
        external
        view
        returns (
            address accountKey,
            uint256 creationTime,
            uint256 accountBalance,
            uint256 stakedAccountSPCoins,
            uint256 accountStakingRewards,
            uint256 sponsorCount,
            uint256 recipientCount,
            uint256 agentCount,
            uint256 parentRecipientCount,
            bool active
        )
    {
        (bool inserted, AccountStruct storage accountRec) = getInternalAccount(_accountKey);
        accountKey = _accountKey;
        if (!inserted) {
            return (
                accountKey,
                creationTime,
                accountBalance,
                stakedAccountSPCoins,
                accountStakingRewards,
                sponsorCount,
                recipientCount,
                agentCount,
                parentRecipientCount,
                active
            );
        }
        accountKey = accountRec.accountKey;
        creationTime = accountRec.creationTime;
        accountBalance = balanceOf[_accountKey];
        stakedAccountSPCoins = accountRec.stakedSPCoins;
        accountStakingRewards = accountRec.stakingRewards;
        sponsorCount = accountRec.sponsorKeys.length;
        recipientCount = accountRec.recipientKeys.length;
        agentCount = accountRec.agentKeys.length;
        parentRecipientCount = accountRec.parentRecipientKeys.length;
        active = hasActiveLinks(_accountKey);
    }

    function getAccountRecord(address _accountKey)
        external
        view
        returns (
            address accountKey,
            uint256 creationTime,
            uint256 accountBalance,
            uint256 stakedAccountSPCoins,
            uint256 accountStakingRewards,
            address[] memory sponsorKeys,
            address[] memory recipientKeys,
            address[] memory agentKeys,
            address[] memory parentRecipientKeys
        )
    {
        (bool inserted, AccountStruct storage accountRec) = getInternalAccount(_accountKey);
        accountKey = _accountKey;
        if (!inserted) {
            sponsorKeys = new address[](0);
            recipientKeys = new address[](0);
            agentKeys = new address[](0);
            parentRecipientKeys = new address[](0);
            return (
                accountKey,
                creationTime,
                accountBalance,
                stakedAccountSPCoins,
                accountStakingRewards,
                sponsorKeys,
                recipientKeys,
                agentKeys,
                parentRecipientKeys
            );
        }
        accountKey = accountRec.accountKey;
        creationTime = accountRec.creationTime;
        accountBalance = balanceOf[_accountKey];
        stakedAccountSPCoins = accountRec.stakedSPCoins;
        accountStakingRewards = accountRec.stakingRewards;
        sponsorKeys = accountRec.sponsorKeys;
        recipientKeys = accountRec.recipientKeys;
        agentKeys = accountRec.agentKeys;
        parentRecipientKeys = accountRec.parentRecipientKeys;
    }

    function getAccountLinks(address _accountKey)
        external
        view
        returns (
            address[] memory sponsorKeys,
            address[] memory recipientKeys,
            address[] memory agentKeys,
            address[] memory parentRecipientKeys
        )
    {
        (bool inserted, AccountStruct storage accountRec) = getInternalAccount(_accountKey);
        if (!inserted) {
            sponsorKeys = new address[](0);
            recipientKeys = new address[](0);
            agentKeys = new address[](0);
            parentRecipientKeys = new address[](0);
            return (sponsorKeys, recipientKeys, agentKeys, parentRecipientKeys);
        }
        sponsorKeys = accountRec.sponsorKeys;
        recipientKeys = accountRec.recipientKeys;
        agentKeys = accountRec.agentKeys;
        parentRecipientKeys = accountRec.parentRecipientKeys;
    }

    /////////////////////////// AGENT REQUESTS //////////////////////////////
 
    /// @notice retrieves the recipient keys linked to an account.
    /// @param _sponsorKey public account key to set new balance
    function getRecipientKeys(address _sponsorKey) 
    external view returns (address[] memory) {
        return accountMap[_sponsorKey].recipientKeys;
    }

    /// @notice retrieves the agent keys linked to an account.
    /// @param _accountKey public account key to query
    function getAgentKeys(address _accountKey)
    external view returns (address[] memory) {
        return accountMap[_accountKey].agentKeys;
    }

    function getAccountListIndex (address _accountKey, 
        address[] storage _accountKeyList) internal view returns (uint) {
        uint i = 0;
        for (i; i < _accountKeyList.length; i++) {
            if (_accountKeyList[i] == _accountKey) {
                break;
            }
        }
        return i; 
    }

    modifier accountExists (address _accountKey) {
        require (accountMap[_accountKey].inserted , "ACCOUNT_NOT_FOUND");
        _;
    }
}
