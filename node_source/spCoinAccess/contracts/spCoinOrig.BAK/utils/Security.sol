// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;
import "../dataTypes/SpCoinDataTypes.sol";

import "hardhat/console.sol";

contract Security is SpCoinDataTypes {
    address private  rootAdmin;
 
    constructor()  {
        rootAdmin = msg.sender;
    }

    // modifier onlyRootAdmin () {
    //     require (msg.sender == rootAdmin, "Root Admin Security Access Violation");
    //     _;
    // }

    // modifier onlyOwner (address _account) {
    //     require (msg.sender == _account, "Owner Security Access Violation");
    //     _;
    // }

    modifier onlyOwnerOrRootAdmin (string memory callingMethod, address _account) {
        // console.log(callingMethod, " => onlyOwnerOrRootAdmin (", _account, msg.sender);
        require (msg.sender == rootAdmin || msg.sender == _account, "Owner or Root Admin Security Access Violation");
        _;
    }

    modifier nonRedundantRecipient (address _sponsorKey, address _recipientKey) {
        require (_sponsorKey != _recipientKey , "_sponsorKey and _recipientKey must be Mutually Exclusive)");
        _;
    }

    modifier nonRedundantAgent (address _recipientKey, address _agentKey) {
        require (msg.sender != _recipientKey && 
                 _recipientKey != _agentKey && 
                 msg.sender != _agentKey , "_accountKey, _recipientKey and _agentKey must be Mutually Exclusive)");
        _;
    }

    /// @notice determines if address Record is inserted in accountKey array
    /// @param _accountKey public accountKey validate Insertion
    function isAccountInserted(address _accountKey)
        public view returns (bool) {
        if (accountMap[_accountKey].inserted) 
            return true;
        else
            return false;
    }


/*
    modifier validateSufficientAccountBalance (uint256 _amount) {
       require(balanceOf[msg.sender] >= _amount, "Insufficient Balance");
        _;
    }
*/
}
