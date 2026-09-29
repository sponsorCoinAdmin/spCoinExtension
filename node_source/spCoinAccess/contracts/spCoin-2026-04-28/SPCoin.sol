// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "./Token.sol";

contract SPCoin is Token{

    constructor(string memory initialVersion)  {
//        logDetail("JS => MESSAGE.SENDER: ", msg.sender);
//        logDetail("JS => MESSAGE.SENDER: ", msg.sender);
// initToken(defaultName,  defaultSymbol, defaultDecimals, defaultTotalSupply);

        version = bytes(initialVersion).length == 0 ? defaultVersion : initialVersion;
        name = concat(defaultName, version);
        symbol = concat(defaultSymbol, version);
        decimals = defaultDecimals;
        balanceOf[msg.sender] = totalSupply = totalUnstakedSpCoins = defaultTotalSupply;
        stakedSPCoins = 0;
        emit Transfer(address(0), msg.sender, defaultTotalSupply);
        // console.log("msg.sender = ", msg.sender);
        // console.log("balanceOf[msg.sender] = ", balanceOf[msg.sender]);
    }

    /*
    function init() public {
        initToken(defaultName,  defaultSymbol, defaultDecimals, defaultTotalSupply);
    }

    function initToken(string memory _name, string memory _symbol, uint _decimals, uint _totalSupply) public onlyRootAdmin {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        totalSupply = _totalSupply;
        balanceOf[msg.sender] = _totalSupply;
        stakedSPCoins = 0;
    }
*/

}
