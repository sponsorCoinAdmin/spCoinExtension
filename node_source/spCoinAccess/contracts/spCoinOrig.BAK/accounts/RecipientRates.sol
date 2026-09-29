// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
/// @title ERC20 Contract
import "./Recipient.sol";

contract RecipientRates is Recipient {

    constructor() { }

    /// @notice insert recipients Agent
    /// @param _recipientKey public account key to get recipient array
    /// @param _recipientRateKey public account key to get recipient Rate for a given recipient
    function getRecipientTransaction(address _sponsorKey, address _recipientKey, uint _recipientRateKey, uint _creationDate) 
    internal returns (RecipientRateStruct storage) {
        RecipientStruct storage recipientRecord = getRecipientRecord(_sponsorKey, _recipientKey);
        RecipientRateStruct storage recipientTransaction = getRecipientTransactionByKeys(_sponsorKey, _recipientKey, _recipientRateKey);
        if (!recipientTransaction.inserted) {
            recipientTransaction.recipientRate = _recipientRateKey;
            recipientTransaction.inserted = true;
            recipientTransaction.creationTime = _creationDate;
            // recipientTransaction.stakedSPCoins = 0;
            recipientRecord.recipientRateList.push(_recipientRateKey);
        }
        return recipientTransaction; 
    }

/*
    /// @notice insert recipients Agent
    /// @param _recipientKey public account key to get recipient array
    /// @param _recipientRateKey public account key to get recipient Rate for a given recipient
    function getRecipientTransaction(address _sponsorKey, address _recipientKey, uint _recipientRateKey) 
    internal returns (RecipientRateStruct storage) {
        RecipientStruct storage recipientRecord = getRecipientRecord(_sponsorKey, _recipientKey);
        RecipientRateStruct storage recipientTransaction = getRecipientTransactionByKeys(_sponsorKey, _recipientKey, _recipientRateKey);
        if (!recipientTransaction.inserted) {
            recipientTransaction.recipientRate = _recipientRateKey;
            recipientTransaction.inserted = true;
            recipientTransaction.creationTime = block.timestamp;
            recipientTransaction.stakedSPCoins = 0;
            recipientRecord.recipientRateList.push(_recipientRateKey);
        }
        return recipientTransaction; 
    }
*/

    function getRecipientTransactionByKeys(address _sponsorKey, address _recipientKey, uint _recipientRateKey)
    internal view  returns (RecipientRateStruct storage) {
        RecipientStruct storage recipientRecord = getRecipientRecordByKeys(_sponsorKey, _recipientKey) ;
        return recipientRecord.recipientRateMap[_recipientRateKey];
    }

    function getSerializedRecipientRateList(address _sponsorKey, address _recipientKey, uint256 _recipientRateKey) public view returns (string memory) {
        // console.log("ZZZZ RecipientRates.sol:getSerializedRecipientRateList ", ",", _sponsorKey,", "); 
        // console.log("ZZZZ", _recipientKey, ", ",  _recipientRateKey);
        RecipientRateStruct storage recipientTransaction =  getRecipientTransactionByKeys(_sponsorKey, _recipientKey, _recipientRateKey);
        string memory recipientTransactionStr = toString(recipientTransaction.creationTime);
        string memory lastUpdateTimeStr = toString(recipientTransaction.lastUpdateTime);
        string memory stakedSPCoinsStr = toString(recipientTransaction.stakedSPCoins);
        recipientTransactionStr = concat(recipientTransactionStr, ",", lastUpdateTimeStr, ",", stakedSPCoinsStr);
        // console.log("ZZZZ getSerializedRecipientRateList recipientTransactionStr ", recipientTransactionStr);
        return recipientTransactionStr;
    }
}
