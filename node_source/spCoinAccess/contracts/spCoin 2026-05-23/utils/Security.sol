// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;
import "../dataTypes/SpCoinDataTypes.sol";

contract Security is SpCoinDataTypes {
    address private contractOwner;
    error SpCoinError(uint8 code);
    uint256 internal constant MAX_INFLATION_RATE = 100;
    uint256 internal constant MAX_RECIPIENT_RATE = 10000;
    uint256 internal constant MAX_AGENT_RATE = 10000;

    uint8 internal constant RECIP_RATE_NOT_FOUND = 0;
    uint8 internal constant AGENT_RATE_NOT_FOUND = 1;
    uint8 internal constant RECIP_RATE_HAS_AGENT = 2;
    uint8 internal constant AGENT_NOT_FOUND = 3;
    uint8 internal constant OWNER_OR_ROOT = 4;
    uint8 internal constant ZERO_ADDRESS = 5;
    uint8 internal constant INSUFFICIENT_BALANCE = 6;
    uint8 internal constant ROOT_ADMIN_ONLY = 7;
    uint8 internal constant DUPLICATE_RELATIONSHIP = 8;
    uint8 internal constant INFLATION_OUT_OF_RANGE = 9;
    uint8 internal constant RECIPIENT_RATE_OUT_OF_RANGE = 10;
    uint8 internal constant RECIPIENT_RATE_INCREMENT = 11;
    uint8 internal constant RECIPIENT_INCREMENT_ZERO = 12;
    uint8 internal constant AGENT_RATE_OUT_OF_RANGE = 13;
    uint8 internal constant AGENT_RATE_INCREMENT = 14;
    uint8 internal constant AGENT_INCREMENT_ZERO = 15;
    uint8 internal constant AMOUNT_ZERO = 16;
    uint8 internal constant ACCOUNT_NOT_FOUND = 17;
    uint8 internal constant RECIPIENT_NOT_FOUND = 18;
    uint8 internal constant RECIPIENT_HAS_SPONSOR = 19;
    uint8 internal constant AGENT_HAS_PARENT = 20;
    uint8 internal constant SPONSOR_HAS_RECIPIENT = 21;
    uint8 internal constant RECIPIENT_TRANSACTION_OOB = 22;
    uint8 internal constant AGENT_TRANSACTION_OOB = 23;
 
    constructor()  {
        contractOwner = msg.sender;
    }

    event InflationRateUpdated(uint256 oldInflationRate, uint256 newInflationRate);
    event RecipientRateRangeUpdated(uint256 oldLowerRecipientRate, uint256 oldUpperRecipientRate, uint256 newLowerRecipientRate, uint256 newUpperRecipientRate);
    event RecipientRateIncrementUpdated(uint256 oldRecipientRateIncrement, uint256 newRecipientRateIncrement);
    event AgentRateRangeUpdated(uint256 oldLowerAgentRate, uint256 oldUpperAgentRate, uint256 newLowerAgentRate, uint256 newUpperAgentRate);
    event AgentRateIncrementUpdated(uint256 oldAgentRateIncrement, uint256 newAgentRateIncrement);

    function owner() external view returns (address) {
        return contractOwner;
    }

    modifier onlyRootAdmin () {
        if (msg.sender != contractOwner) revert SpCoinError(ROOT_ADMIN_ONLY);
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
        if (_sponsorKey == _recipientKey) revert SpCoinError(DUPLICATE_RELATIONSHIP);
        _;
    }

    modifier nonRedundantAgent (address _sponsorKey, address _recipientKey, address _agentKey) {
        if (
            _sponsorKey == _recipientKey ||
            _recipientKey == _agentKey ||
            _sponsorKey == _agentKey
        ) revert SpCoinError(DUPLICATE_RELATIONSHIP);
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
        if (newInflationRate > MAX_INFLATION_RATE) revert SpCoinError(INFLATION_OUT_OF_RANGE);
        uint256 oldInflationRate = annualInflation;
        annualInflation = newInflationRate;
        emit InflationRateUpdated(oldInflationRate, newInflationRate);
    }

    function getRecipientRateRange() external view returns (uint256, uint256) {
        return (lowerRecipientRate, upperRecipientRate);
    }

    function setRecipientRateRange(uint256 newLowerRecipientRate, uint256 newUpperRecipientRate) external onlyRootAdmin {
        if (
            newLowerRecipientRate > newUpperRecipientRate ||
            newUpperRecipientRate > MAX_RECIPIENT_RATE
        ) revert SpCoinError(RECIPIENT_RATE_OUT_OF_RANGE);
        uint256 oldLowerRecipientRate = lowerRecipientRate;
        uint256 oldUpperRecipientRate = upperRecipientRate;
        lowerRecipientRate = newLowerRecipientRate;
        upperRecipientRate = newUpperRecipientRate;
        emit RecipientRateRangeUpdated(oldLowerRecipientRate, oldUpperRecipientRate, newLowerRecipientRate, newUpperRecipientRate);
    }

    function getRecipientRateIncrement() external view returns (uint256) {
        return recipientRateIncrement;
    }

    function setRecipientRateIncrement(uint256 newRecipientRateIncrement) external onlyRootAdmin {
        if (newRecipientRateIncrement == 0) revert SpCoinError(RECIPIENT_INCREMENT_ZERO);
        uint256 oldRecipientRateIncrement = recipientRateIncrement;
        recipientRateIncrement = newRecipientRateIncrement;
        emit RecipientRateIncrementUpdated(oldRecipientRateIncrement, newRecipientRateIncrement);
    }

    function getAgentRateRange() external view returns (uint256, uint256) {
        return (lowerAgentRate, upperAgentRate);
    }

    function setAgentRateRange(uint256 newLowerAgentRate, uint256 newUpperAgentRate) external onlyRootAdmin {
        if (
            newLowerAgentRate > newUpperAgentRate ||
            newUpperAgentRate > MAX_AGENT_RATE
        ) revert SpCoinError(AGENT_RATE_OUT_OF_RANGE);
        uint256 oldLowerAgentRate = lowerAgentRate;
        uint256 oldUpperAgentRate = upperAgentRate;
        lowerAgentRate = newLowerAgentRate;
        upperAgentRate = newUpperAgentRate;
        emit AgentRateRangeUpdated(oldLowerAgentRate, oldUpperAgentRate, newLowerAgentRate, newUpperAgentRate);
    }

    function getAgentRateIncrement() external view returns (uint256) {
        return agentRateIncrement;
    }

    function setAgentRateIncrement(uint256 newAgentRateIncrement) external onlyRootAdmin {
        if (newAgentRateIncrement == 0) revert SpCoinError(AGENT_INCREMENT_ZERO);
        uint256 oldAgentRateIncrement = agentRateIncrement;
        agentRateIncrement = newAgentRateIncrement;
        emit AgentRateIncrementUpdated(oldAgentRateIncrement, newAgentRateIncrement);
    }

    function rateMatchesIncrement(uint256 rate, uint256 lowerRate, uint256 increment) internal pure returns (bool) {
        return ((rate - lowerRate) % increment) == 0;
    }

    function validateRecipientRateRange(uint256 _recipientRateKey) internal view {
        if (_recipientRateKey < lowerRecipientRate || _recipientRateKey > upperRecipientRate) {
            revert SpCoinError(RECIPIENT_RATE_OUT_OF_RANGE);
        }
        if (!rateMatchesIncrement(_recipientRateKey, lowerRecipientRate, recipientRateIncrement)) {
            revert SpCoinError(RECIPIENT_RATE_INCREMENT);
        }
    }

    function validateAgentRateRange(uint256 _agentRateKey) internal view {
        if (_agentRateKey < lowerAgentRate || _agentRateKey > upperAgentRate) {
            revert SpCoinError(AGENT_RATE_OUT_OF_RANGE);
        }
        if (!rateMatchesIncrement(_agentRateKey, lowerAgentRate, agentRateIncrement)) {
            revert SpCoinError(AGENT_RATE_INCREMENT);
        }
    }


/*
    modifier validateSufficientAccountBalance (uint256 _amount) {
       require(balanceOf[msg.sender] >= _amount, "Insufficient Balance");
        _;
    }
*/
}
