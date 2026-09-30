// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;
/// @title ERC20 Contract

import "./rewardsManagement/StakingManager.sol";
import "./rewardsManagement/RewardsManager.sol";
import "./accounts/UnSubscribe.sol";

contract Token is UnSubscribe{

/*
    constructor(string memory _name, string memory _symbol, uint _decimals, uint _totalSupply) {
        initToken(_name, _symbol, _decimals, _totalSupply);
    }
*/

    constructor() { }

    /// @notice transfer amount of tokens to an address
    /// @param _to receiver of token
    /// @param _value amount value of token to send
    /// @return success as true, for transfer
    function transfer(address _to, uint256 _value) 
    public virtual returns (bool success) {
        // console.log("transfer:msg.sender =", msg.sender, "_value =", _value);
        require(balanceOf[msg.sender] >= _value, concat("ACCOUNT ", toString(msg.sender), " *** INSUFFICIENT BALANCE ***"));
        addAccountRecord(UNDEFINED, _to);
        balanceOf[msg.sender] = balanceOf[msg.sender] - (_value);
        balanceOf[_to] = balanceOf[_to] + (_value);
        return true;
    }

    /// @notice Approve other to spend on your behalf eg an exchange 
    /// @param _spender allowed to spend and a max amount allowed to spend
    /// @param _value amount value of token to send
    /// @return true, success once address approved
    // Emit the Approval event  
    // Allow _spender to spend up to _value on your behalf
    function approve(address _spender, uint256 _value)
    external returns (bool) {
        require(_spender != address(0));
        allowance[msg.sender][_spender] = _value;
        emit Approval(msg.sender, _spender, _value);
        return true;
    }

    /// @notice transfer by approved person from original address of an amount within approved limit 
    /// @param _from, address sending to and the amount to send
    /// @param _to receiver of token
    /// @param _value amount value of token to send
    /// @dev internal helper transfer function with required safety checks
    /// @return true, success once transfered from original account    
    // Allow _spender to spend up to _value on your behalf
    function transferFrom(address _from, address _to, uint256 _value) 
    external returns (bool) {
        require(_value <= balanceOf[_from]);
        require(_value <= allowance[_from][msg.sender]);
        allowance[_from][msg.sender] = allowance[_from][msg.sender] - (_value);
        balanceOf[_from] = balanceOf[_from] - (_value);
        balanceOf[_to] = balanceOf[_to] + (_value);
        return true;
    }
}
