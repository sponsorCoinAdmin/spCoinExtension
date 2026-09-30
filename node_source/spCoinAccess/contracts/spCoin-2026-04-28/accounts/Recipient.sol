// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;
/// @title ERC20 Contract
import "./Sponsor.sol";

contract Recipient is Sponsor {

    constructor() { }

    /// @notice Create Sponsor and Recipient accounts if they do not exist
    /// @notice Relate Sponsor and Recipient accounts for POS sharing
    /// @param _recipientKey new recipient to add to account list
    function addRecipient(address _sponsorKey, address _recipientKey)
    external
    onlyOwnerOrRootAdmin(_sponsorKey)
    nonRedundantRecipient (_sponsorKey, _recipientKey) {
        AccountStruct storage sponsorRecord = getSponsorAccountRecord(_sponsorKey);
        RecipientStruct storage recipientRecord = accountMap[_sponsorKey].recipientMap[_recipientKey];
        bool sponsorHasRecipientLink = accountInList(_recipientKey, sponsorRecord.recipientKeys);
        bool recipientHasSponsorLink = accountInList(_sponsorKey, accountMap[_recipientKey].sponsorKeys);

        if (recipientRecord.inserted) {
            require(sponsorHasRecipientLink && recipientHasSponsorLink, "RECIP_LINK_STALE");
            revert("RECIP_LINK_EXISTS");
        }

        require(!sponsorHasRecipientLink && !recipientHasSponsorLink, "RECIP_LIST_STALE");
        getRecipient(_sponsorKey, _recipientKey);
    }

    function getRecipient(address _sponsor, address _recipientKey)
    internal returns (RecipientStruct storage) {
        AccountStruct storage sponsorRecord = getSponsorAccountRecord(_sponsor);
        // console.log("getRecipientRecord(", _sponsor, ", ", _recipientKey);

        // START DEBUG AREA
        // string memory myMsg = concat("getRecipientRecord(",
        // toString(msg.sender), ",", toString(sponsor), "," ); 
        // myMsg = concat(myMsg, toString(msg.sender), "," , toString(_recipientKey), ")");   
        // console.log(myMsg);
        // END DEBUG AREA

        RecipientStruct storage recipientRecord = accountMap[_sponsor].recipientMap[_recipientKey];
        if (!recipientRecord.inserted) {
            addAccountRecord(RECIPIENT, _recipientKey);
            recipientRecord.creationTime = block.timestamp;
            recipientRecord.sponsorKey = _sponsor;
            recipientRecord.recipientKey = _recipientKey;
            recipientRecord.stakedSPCoins = 0; // Coins not owned but Recipiented
            recipientRecord.inserted = true;
            sponsorRecord.recipientKeys.push(_recipientKey);
            accountMap[_recipientKey].sponsorKeys.push(_sponsor);
        }
        return recipientRecord;
    }

    function getRecipientRecordByKeys(address _sponsorKey, address _recipientKey)
    internal view  returns (RecipientStruct storage) {
    ///////////////// **** WORKING HERE ****
        // console.log("===============================================================");
        // console.log("=========> Recipient.sol:getRecipientRecordByKeys(",_sponsorKey ,_recipientKey,")");
        RecipientStruct storage recipientRecord = accountMap[_sponsorKey].recipientMap[_recipientKey];
        // console.log("=========> recipientRecord.recipientKey = ", recipientRecord.recipientKey);
        // console.log("===============================================================");
        return recipientRecord;
        // return accountMap[sponsor].recipientMap[_recipientKey];
    }

    function getRecipientRecordCore(address _sponsorKey, address _recipientKey)
        external
        view
        returns (
            uint256 creationTime,
            uint256 stakedSPCoins,
            bool inserted
        )
    {
        RecipientStruct storage recipientRecord = getRecipientRecordByKeys(_sponsorKey, _recipientKey);
        creationTime = recipientRecord.creationTime;
        stakedSPCoins = recipientRecord.stakedSPCoins;
        inserted = recipientRecord.inserted;
    }

    //////////////////// NESTED AGENT METHODS /////////////////////////

    /// @notice retrieves the recipient rate keys for a sponsor-recipient pair.
    /// @param _recipientKey recipient Key to retrieve the recipient list
    function getRecipientRateList(address _sponsorKey, address _recipientKey)
        external view  returns (uint[] memory) {
        // console.log("Recipient.sol:getRecipientRateList (", toString(_sponsorKey), ",", toString(_recipientKey));
        RecipientStruct storage recipientRecord = getRecipientRecordByKeys(_sponsorKey, _recipientKey);
        uint[] memory recipientRateKeys = recipientRecord.recipientRateKeys;
        // console.log("Recipient.sol:getRecipientRateList recipientRateKeys.length = ", recipientRateKeys.length);
        // console.log("AGENTS.SOL:addAgent: _sponsorKey, _recipientKey, _recipientRateKey, _recipientKey = " , _sponsorKey, _recipientKey, _recipientRateKey, _recipientKey);
        // console.log("AGENTS.SOL:addAgent:recipientRecord.recipientKey = " , recipientRecord.recipientKey);
        // console.log("AGENTS.SOL:getAgentRateList:recipientRateKeys.length = ",recipientRateKeys.length);
        return recipientRateKeys;
    }

    /*
    ///////////////////// DELETE RECIPIENT METHODS ////////////////////////
    modifier recipientExists (address _sponsorKey, address _recipientKey) {
        require (isRecipientInserted(_recipientKey) , "RECIP_NOT_FOUND");
        _;
    }
*/
}
