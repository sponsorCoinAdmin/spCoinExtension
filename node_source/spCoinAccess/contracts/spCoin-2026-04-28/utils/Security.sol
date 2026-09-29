// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;
import "../dataTypes/SpCoinDataTypes.sol";

import "hardhat/console.sol";

contract Security is SpCoinDataTypes {
    address private contractOwner;
    error SpCoinError(uint8 code);

    uint8 internal constant RECIP_RATE_NOT_FOUND = 0;
    uint8 internal constant AGENT_RATE_NOT_FOUND = 1;
    uint8 internal constant RECIP_RATE_HAS_AGENT = 2;
    uint8 internal constant AGENT_NOT_FOUND = 3;
    uint8 internal constant OWNER_OR_ROOT = 4;
 
    constructor()  {
        contractOwner = msg.sender;
    }

    function owner() external view returns (address) {
        return contractOwner;
    }

    modifier onlyRootAdmin () {
        require (msg.sender == contractOwner, "ROOT_ONLY");
        _;
    }

    // modifier onlyOwner (address _account) {
    //     require (msg.sender == _account, "Owner Security Access Violation");
    //     _;
    // }

    modifier onlyOwnerOrRootAdmin (address _account) {
        if (msg.sender != contractOwner && msg.sender != _account) {
            revert SpCoinError(OWNER_OR_ROOT);
        }
        _;
    }

    modifier nonRedundantRecipient (address _sponsorKey, address _recipientKey) {
        require (_sponsorKey != _recipientKey , "RECIP_DUP");
        _;
    }

    modifier nonRedundantAgent (address _sponsorKey, address _recipientKey, address _agentKey) {
        require (_sponsorKey != _recipientKey &&
                 _recipientKey != _agentKey && 
                 _sponsorKey != _agentKey , "AGENT_DUP");
        _;
    }

    /// @notice determines if address Record is inserted in accountKey array
    /// @param _accountKey public accountKey validate Insertion
    function isAccountInserted(address _accountKey)
        external view returns (bool) {
        if (accountMap[_accountKey].inserted) 
            return true;
        else
            return false;
    }

    function getInflationRate() external view returns (uint256) {
        return annualInflation;
    }

    function setInflationRate(uint256 newInflationRate) external onlyRootAdmin {
        annualInflation = newInflationRate;
    }

    function getRecipientRateRange() external view returns (uint256, uint256) {
        return (lowerRecipientRate, upperRecipientRate);
    }

    function setRecipientRateRange(uint256 newLowerRecipientRate, uint256 newUpperRecipientRate) external onlyRootAdmin {
        require(newLowerRecipientRate <= newUpperRecipientRate, "REC_LOW_GT_UP");
        lowerRecipientRate = newLowerRecipientRate;
        upperRecipientRate = newUpperRecipientRate;
    }

    function getAgentRateRange() external view returns (uint256, uint256) {
        return (lowerAgentRate, upperAgentRate);
    }

    function setAgentRateRange(uint256 newLowerAgentRate, uint256 newUpperAgentRate) external onlyRootAdmin {
        require(newLowerAgentRate <= newUpperAgentRate, "AG_LOW_GT_UP");
        lowerAgentRate = newLowerAgentRate;
        upperAgentRate = newUpperAgentRate;
    }

    function validateRecipientRateRange(uint256 _recipientRateKey) internal view {
        require(
            _recipientRateKey >= lowerRecipientRate && _recipientRateKey <= upperRecipientRate,
            "REC_RATE_OOR"
        );
    }

    function validateAgentRateRange(uint256 _agentRateKey) internal view {
        require(
            _agentRateKey >= lowerAgentRate && _agentRateKey <= upperAgentRate,
            "AG_RATE_OOR"
        );
    }


/*
    modifier validateSufficientAccountBalance (uint256 _amount) {
       require(balanceOf[msg.sender] >= _amount, "Insufficient Balance");
        _;
    }
*/
}
