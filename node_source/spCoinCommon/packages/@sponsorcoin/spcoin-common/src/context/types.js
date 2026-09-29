"use strict";
// File: spCoinCommon/src/context/types.ts
//
// Copied from lib/structure/exchangeContextCore/types/types.ts in the
// parent app repo (2026-09-06, build plan step 3 — see
// docs/design/spcoinPackagesDesign.md §4 there). Import paths adjusted
// to this package's own layout (SP_COIN_DISPLAY now comes from the
// sibling /panels subpath within this same package; STATUS/
// TRADE_DIRECTION/FEED_TYPE from this package's own enums.ts); content
// otherwise unchanged. `ContractRecs` below keeps its real dependency on
// wagmi's `UseReadContractReturnType` — declared as a peerDependency in
// this package's package.json, not stripped out, per step 4's "isolated
// build surfaces accidental dependencies" plan (this one is a real,
// intentional one, not accidental — kept, not fixed).
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERROR_CODES = exports.MESSAGE_ACCOUNTS_MARKER = exports.AccountType = void 0;
/** Who to claim rewards for */
var AccountType;
(function (AccountType) {
    AccountType["SPONSOR"] = "SPONSOR";
    AccountType["RECIPIENT"] = "RECIPIENT";
    AccountType["AGENT"] = "AGENT";
    AccountType["ALL"] = "ALL";
})(AccountType || (exports.AccountType = AccountType = {}));
/**
 * Embedded in ErrorMessage.msg by callers to mark exactly where
 * MessagePanel should render the accounts/amount block.
 */
exports.MESSAGE_ACCOUNTS_MARKER = '<<<MESSAGE_ACCOUNTS_MARKER>>>';
exports.ERROR_CODES = {
    CHAIN_SWITCH: 1001,
    PRICE_FETCH_ERROR: 2001,
    INVALID_TOKENS: 3001,
};
