// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;
/// @title ERC20 Contract
import "./Sponsor.sol";

contract Recipient is Sponsor {

    constructor() { }

    /// @notice Create Sponsor and Recipient accounts if they do not exist
    /// @notice Relate Sponsor and Recipient accounts for POS sharing
    /// @param _recipientKey new recipient to add to account list
    function addRecipient(address _recipientKey) 
    public nonRedundantRecipient (msg.sender, _recipientKey) {
        getRecipientRecord(msg.sender, _recipientKey);
    }

    function getRecipientRecord(address _sponsor, address _recipientKey)
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
            sponsorRecord.recipientAccountList.push(_recipientKey);
            accountMap[_recipientKey].sponsorAccountList.push(msg.sender);
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

    function getSerializedRecipientRecordList(address _sponsorKey, address _recipientKey) public view returns (string memory) {
// console.log("Recipient.sol:getSerializedRecipientRecordList(", _sponsorKey, ",", _recipientKey);
        RecipientStruct storage recipientRecord =  getRecipientRecordByKeys(_sponsorKey, _recipientKey);
        string memory recipientRecordStr = toString(recipientRecord.creationTime);
        string memory stakedSPCoinsStr = toString(recipientRecord.stakedSPCoins);
        recipientRecordStr = concat(recipientRecordStr, ",", stakedSPCoinsStr);
        return recipientRecordStr;
    }

    //////////////////// NESTED AGENT METHODS /////////////////////////

    /// @notice retreives the recipient array records from a specific account address.
    /// @param _recipientKey recipient Key to retrieve the recipient list
    function getRecipientRateList(address _sponsorKey, address _recipientKey)
        public view  returns (uint[] memory) {
        // console.log("Recipient.sol:getRecipientRateList (", toString(_sponsorKey), ",", toString(_recipientKey));
        RecipientStruct storage recipientRecord = getRecipientRecordByKeys(_sponsorKey, _recipientKey);
        uint[] memory recipientRateList = recipientRecord.recipientRateList;
        // console.log("Recipient.sol:getRecipientRateList recipientRateList.length = ", recipientRateList.length);
        // console.log("AGENTS.SOL:addAgent: _sponsorKey, _recipientKey, _recipientRateKey, _recipientKey = " , _sponsorKey, _recipientKey, _recipientRateKey, _recipientKey);
        // console.log("AGENTS.SOL:addAgent:recipientRecord.recipientKey = " , recipientRecord.recipientKey);
        // console.log("AGENTS.SOL:getAgentRateList:recipientRateList.length = ",recipientRateList.length);
        return recipientRateList;
    }

    /*
    ///////////////////// DELETE RECIPIENT METHODS ////////////////////////
    modifier recipientExists (address _sponsorKey, address _recipientKey) {
        require (isRecipientInserted(_recipientKey) , "_recipientKey not found)");
        _;
    }
*/
}
