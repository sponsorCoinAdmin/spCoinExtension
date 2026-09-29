// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;
/// @title ERC20 Contract
import "./Account.sol";

contract Sponsor is Account {
    constructor() {}

    /// @notice insert block chain network address for spCoin Management
    function addSponsor(address sponsor)
        public {
            addAccountRecord(SPONSOR, sponsor);
    }

    function getSponsorAccountRecord(address sponsor)
        internal returns (AccountStruct storage accountRecord) {
        return getAccountRecord(SPONSOR, sponsor);
    }
}
