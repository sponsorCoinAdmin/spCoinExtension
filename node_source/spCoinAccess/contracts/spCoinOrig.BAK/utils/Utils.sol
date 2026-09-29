// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;
/// @title ERC20 Contract
import "hardhat/console.sol";
import "./Security.sol";
//import "./StringUtils.sol";
import "./TimeUtils.sol";
import "./StringUtils.sol";

contract Utils is Security, TimeUtils {
    constructor() {
    }
  
    function msgSender() external view returns(address){
        return (msg.sender);
     }


}
