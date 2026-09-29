// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "hardhat/console.sol";
import "./StringUtils.sol";


contract TimeUtils is StringUtils{
    constructor() {
    }

    uint constant second = 1;
    uint constant minute = second * 60;
    uint constant hour = minute * 60;
    uint constant day = hour * 24;
    uint constant week = day * 7;
    // uint constant year = (day * 36525)/100;
    uint constant year = (day * 365242199)/1000000;
    
    uint constant month = year/12;

}

/*
contract Countdown {

    function getTimeUnits() external view returns(uint, uint, uint, uint, uint, uint) {
        return(block.timestamp, 1 seconds, 1 minutes, 1 hours, 1 days, 1 weeks);
    }


    uint yesVote;
    uint noVote;

    uint public startTime;
    function start() external {
        startTime = block.timestamp;
    }

    function voteYes() external {
        require(block.timestamp < startTime + 60 seconds, "voting period passed, wait next year");
        yesVote++;
    }

    function voteNo() external {
        require(block.timestamp < startTime + 60 seconds, "voting period passed, wait next year");
        noVote++;
    }
}
*/