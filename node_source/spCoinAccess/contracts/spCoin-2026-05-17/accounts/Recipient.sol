// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;
/// @title ERC20 Contract
import "./Sponsor.sol";

contract Recipient is Sponsor {

    constructor() { }

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

    function getRecipientRecord(address _sponsorKey, address _recipientKey)
        external
        view
        returns (
            address sponsorKey,
            address recipientKey,
            uint256 creationTime,
            uint256 stakedSPCoins,
            bool inserted
        )
    {
        RecipientStruct storage recipientRecord = getRecipientRecordByKeys(_sponsorKey, _recipientKey);
        sponsorKey = recipientRecord.sponsorKey == address(0) ? _sponsorKey : recipientRecord.sponsorKey;
        recipientKey = recipientRecord.recipientKey == address(0) ? _recipientKey : recipientRecord.recipientKey;
        creationTime = recipientRecord.creationTime;
        stakedSPCoins = recipientRecord.stakedSPCoins;
        inserted = recipientRecord.inserted;
    }

    //////////////////// NESTED AGENT METHODS /////////////////////////

    /// @notice retrieves the recipient rate keys for a sponsor-recipient pair.
    /// @param _recipientKey recipient Key to retrieve the recipient list
    function getSponsorRecipientRates(address _sponsorKey, address _recipientKey)
        external view  returns (uint[] memory) {
        // console.log("Recipient.sol:getSponsorRecipientRates (", toString(_sponsorKey), ",", toString(_recipientKey));
        RecipientStruct storage recipientRecord = getRecipientRecordByKeys(_sponsorKey, _recipientKey);
        uint[] memory recipientRates = recipientRecord.recipientRateKeys;
        // console.log("Recipient.sol:getSponsorRecipientRates recipientRates.length = ", recipientRates.length);
        // console.log("AGENTS.SOL:recipientRecord.recipientKey = " , recipientRecord.recipientKey);
        // console.log("AGENTS.SOL:getAgentRateList:recipientRates.length = ", recipientRates.length);
        return recipientRates;
    }

    function getSponsorRecipientRatesPage(address _sponsorKey, address _recipientKey, uint256 offset, uint256 limit)
        external
        view
        returns (uint256[] memory page, uint256 total)
    {
        RecipientStruct storage recipientRecord = getRecipientRecordByKeys(_sponsorKey, _recipientKey);
        return _sliceAccountUintArray(recipientRecord.recipientRateKeys, offset, limit);
    }

    /*
    ///////////////////// DELETE RECIPIENT METHODS ////////////////////////
    modifier recipientExists (address _sponsorKey, address _recipientKey) {
        require (isRecipientInserted(_recipientKey) , "RECIP_NOT_FOUND");
        _;
    }
*/
}
