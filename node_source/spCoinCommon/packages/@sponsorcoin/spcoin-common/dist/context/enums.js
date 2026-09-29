"use strict";
// File: spCoinCommon/src/context/enums.ts
// Copied from lib/structure/enums/enums.ts in the parent app repo
// (2026-09-06, build plan step 3) — trimmed to just the three enums
// types.ts in this package actually depends on (STATUS, TRADE_DIRECTION,
// FEED_TYPE). BUTTON_TYPE added (2026-09-27, Phase 4 TRADING_STATION_PANEL)
// — needed by ExchangeButton.tsx's portable presentation shell.
// API_TRADING_PROVIDER stays in the parent app (web-app-local provider
// routing, not a button-state enum).
Object.defineProperty(exports, "__esModule", { value: true });
exports.BUTTON_TYPE = exports.TRADE_DIRECTION = exports.STATUS = exports.FEED_TYPE = void 0;
var FEED_TYPE;
(function (FEED_TYPE) {
    FEED_TYPE[FEED_TYPE["REMOTE_AGENT_ACCOUNTS"] = 0] = "REMOTE_AGENT_ACCOUNTS";
    FEED_TYPE[FEED_TYPE["REMOTE_SPONSOR_ACCOUNTS"] = 1] = "REMOTE_SPONSOR_ACCOUNTS";
    FEED_TYPE[FEED_TYPE["REMOTE_RECIPIENT_ACCOUNTS"] = 2] = "REMOTE_RECIPIENT_ACCOUNTS";
    FEED_TYPE[FEED_TYPE["REMOTE_TOKEN_LIST"] = 3] = "REMOTE_TOKEN_LIST";
    // Flat, chain-agnostic directory of every account — not an on-chain
    // relationship feed, unlike REMOTE_*_ACCOUNTS.
    FEED_TYPE[FEED_TYPE["REMOTE_ACCOUNT_SEND_LIST"] = 4] = "REMOTE_ACCOUNT_SEND_LIST";
    FEED_TYPE[FEED_TYPE["MANAGE_AGENTS"] = 5] = "MANAGE_AGENTS";
    FEED_TYPE[FEED_TYPE["MANAGE_RECIPIENTS"] = 6] = "MANAGE_RECIPIENTS";
    // Local wallet account list (all known accounts) — not an on-chain
    // relationship feed. Used by the Send flow's recipient picker.
    FEED_TYPE[FEED_TYPE["WALLET_ACCOUNTS"] = 7] = "WALLET_ACCOUNTS";
})(FEED_TYPE || (exports.FEED_TYPE = FEED_TYPE = {}));
var STATUS;
(function (STATUS) {
    STATUS[STATUS["CONNECTED"] = 0] = "CONNECTED";
    STATUS[STATUS["DISCONNECTED"] = 1] = "DISCONNECTED";
    STATUS[STATUS["CONNECTING"] = 2] = "CONNECTING";
    STATUS[STATUS["RECONNECTING"] = 3] = "RECONNECTING";
    STATUS[STATUS["ERROR_API_PRICE"] = 4] = "ERROR_API_PRICE";
    STATUS[STATUS["FAILED"] = 5] = "FAILED";
    STATUS[STATUS["MESSAGE_ERROR"] = 6] = "MESSAGE_ERROR";
    STATUS[STATUS["SUCCESS"] = 7] = "SUCCESS";
    STATUS[STATUS["WARNING_HARDHAT"] = 8] = "WARNING_HARDHAT";
    STATUS[STATUS["INFO"] = 9] = "INFO";
    STATUS[STATUS["MISSING"] = 10] = "MISSING";
    /** Generic non-critical warning, distinct from WARNING_HARDHAT (specifically "wrong network"). */
    STATUS[STATUS["WARNING"] = 11] = "WARNING";
    /** Developer diagnostics — not user-facing, must not interrupt the current screen. */
    STATUS[STATUS["TRACE_DEBUGGING"] = 12] = "TRACE_DEBUGGING";
})(STATUS || (exports.STATUS = STATUS = {}));
var TRADE_DIRECTION;
(function (TRADE_DIRECTION) {
    TRADE_DIRECTION[TRADE_DIRECTION["SELL_EXACT_OUT"] = 0] = "SELL_EXACT_OUT";
    TRADE_DIRECTION[TRADE_DIRECTION["BUY_EXACT_IN"] = 1] = "BUY_EXACT_IN";
})(TRADE_DIRECTION || (exports.TRADE_DIRECTION = TRADE_DIRECTION = {}));
// 2026-09-27, Phase 4 — added for portable ExchangeButton.tsx presentation shell.
// Byte-identical to the web app's lib/structure/enums/enums.ts BUTTON_TYPE.
var BUTTON_TYPE;
(function (BUTTON_TYPE) {
    BUTTON_TYPE[BUTTON_TYPE["API_TRANSACTION_ERROR"] = 0] = "API_TRANSACTION_ERROR";
    BUTTON_TYPE[BUTTON_TYPE["BUY_ERROR_REQUIRED"] = 1] = "BUY_ERROR_REQUIRED";
    BUTTON_TYPE[BUTTON_TYPE["BUY_TOKEN_REQUIRED"] = 2] = "BUY_TOKEN_REQUIRED";
    BUTTON_TYPE[BUTTON_TYPE["CONNECT"] = 3] = "CONNECT";
    BUTTON_TYPE[BUTTON_TYPE["INSUFFICIENT_BALANCE"] = 4] = "INSUFFICIENT_BALANCE";
    BUTTON_TYPE[BUTTON_TYPE["IS_LOADING_PRICE"] = 5] = "IS_LOADING_PRICE";
    BUTTON_TYPE[BUTTON_TYPE["NO_HARDHAT_API"] = 6] = "NO_HARDHAT_API";
    BUTTON_TYPE[BUTTON_TYPE["SELL_ERROR_REQUIRED"] = 7] = "SELL_ERROR_REQUIRED";
    BUTTON_TYPE[BUTTON_TYPE["SELL_TOKEN_REQUIRED"] = 8] = "SELL_TOKEN_REQUIRED";
    BUTTON_TYPE[BUTTON_TYPE["SWAP"] = 9] = "SWAP";
    BUTTON_TYPE[BUTTON_TYPE["TOKENS_REQUIRED"] = 10] = "TOKENS_REQUIRED";
    BUTTON_TYPE[BUTTON_TYPE["UNDEFINED"] = 11] = "UNDEFINED";
    BUTTON_TYPE[BUTTON_TYPE["ZERO_AMOUNT"] = 12] = "ZERO_AMOUNT";
})(BUTTON_TYPE || (exports.BUTTON_TYPE = BUTTON_TYPE = {}));
