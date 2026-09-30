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
        RecipientStruct storage recipientRecord = getRecipient(_sponsorKey, _recipientKey);
        RecipientRateStruct storage recipientTransaction = getRecipientTransactionByKeys(_sponsorKey, _recipientKey, _recipientRateKey);
        if (!recipientTransaction.inserted) {
            validateRecipientRateRange(_recipientRateKey);
            recipientTransaction.recipientRate = _recipientRateKey;
            recipientTransaction.inserted = true;
            recipientTransaction.creationTime = _creationDate;
            recipientTransaction.lastUpdateTime = _creationDate;
            // recipientTransaction.stakedSPCoins = 0;
            recipientRecord.recipientRateKeys.push(_recipientRateKey);
        }
        return recipientTransaction; 
    }

/*
    /// @notice insert recipients Agent
    /// @param _recipientKey public account key to get recipient array
    /// @param _recipientRateKey public account key to get recipient Rate for a given recipient
    function getRecipientTransaction(address _sponsorKey, address _recipientKey, uint _recipientRateKey) 
    internal returns (RecipientRateStruct storage) {
        RecipientStruct storage recipientRecord = getRecipient(_sponsorKey, _recipientKey);
        RecipientRateStruct storage recipientTransaction = getRecipientTransactionByKeys(_sponsorKey, _recipientKey, _recipientRateKey);
        if (!recipientTransaction.inserted) {
            recipientTransaction.recipientRate = _recipientRateKey;
            recipientTransaction.inserted = true;
            recipientTransaction.creationTime = block.timestamp;
            recipientTransaction.stakedSPCoins = 0;
            recipientRecord.recipientRateKeys.push(_recipientRateKey);
        }
        return recipientTransaction; 
    }
*/

    function getRecipientTransactionByKeys(address _sponsorKey, address _recipientKey, uint _recipientRateKey)
    internal view  returns (RecipientRateStruct storage) {
        RecipientStruct storage recipientRecord = getRecipientRecordByKeys(_sponsorKey, _recipientKey) ;
        return recipientRecord.recipientRateMap[_recipientRateKey];
    }

    function getRecipientTransaction(address _sponsorKey, address _recipientKey, uint256 _recipientRateKey)
        external
        view
        returns (
            address sponsorKey,
            address recipientKey,
            uint256 recipientRateKey,
            uint256 creationTime,
            uint256 lastUpdateTime,
            uint256 stakedSPCoins,
            bool inserted
        )
    {
        RecipientStruct storage recipientRecord = getRecipientRecordByKeys(_sponsorKey, _recipientKey);
        RecipientRateStruct storage recipientTransaction = recipientRecord.recipientRateMap[_recipientRateKey];
        sponsorKey = recipientRecord.sponsorKey == address(0) ? _sponsorKey : recipientRecord.sponsorKey;
        recipientKey = recipientRecord.recipientKey == address(0) ? _recipientKey : recipientRecord.recipientKey;
        recipientRateKey = recipientTransaction.inserted ? recipientTransaction.recipientRate : _recipientRateKey;
        creationTime = recipientTransaction.creationTime;
        lastUpdateTime = recipientTransaction.lastUpdateTime;
        stakedSPCoins = recipientTransaction.stakedSPCoins;
        inserted = recipientTransaction.inserted;
    }
}
