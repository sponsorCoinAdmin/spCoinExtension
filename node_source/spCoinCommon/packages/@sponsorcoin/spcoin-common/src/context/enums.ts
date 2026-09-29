// File: spCoinCommon/src/context/enums.ts
//
// Copied from lib/structure/enums/enums.ts in the parent app repo
// (2026-09-06, build plan step 3) — trimmed to just the three enums
// types.ts in this package actually depends on (STATUS, TRADE_DIRECTION,
// FEED_TYPE). BUTTON_TYPE added (2026-09-27, Phase 4 TRADING_STATION_PANEL)
// — needed by ExchangeButton.tsx's portable presentation shell.
// API_TRADING_PROVIDER stays in the parent app (web-app-local provider
// routing, not a button-state enum).

export enum FEED_TYPE {
  REMOTE_AGENT_ACCOUNTS,
  REMOTE_SPONSOR_ACCOUNTS,
  REMOTE_RECIPIENT_ACCOUNTS,
  REMOTE_TOKEN_LIST,
  // Flat, chain-agnostic directory of every account — not an on-chain
  // relationship feed, unlike REMOTE_*_ACCOUNTS.
  REMOTE_ACCOUNT_SEND_LIST,
  MANAGE_AGENTS,
  MANAGE_RECIPIENTS,
  // Local wallet account list (all known accounts) — not an on-chain
  // relationship feed. Used by the Send flow's recipient picker.
  WALLET_ACCOUNTS,
}

export enum STATUS {
  CONNECTED,
  DISCONNECTED,
  CONNECTING,
  RECONNECTING,
  ERROR_API_PRICE,
  FAILED,
  MESSAGE_ERROR,
  SUCCESS,
  WARNING_HARDHAT,
  INFO,
  MISSING,
  /** Generic non-critical warning, distinct from WARNING_HARDHAT (specifically "wrong network"). */
  WARNING,
  /** Developer diagnostics — not user-facing, must not interrupt the current screen. */
  TRACE_DEBUGGING,
}

export enum TRADE_DIRECTION {
  SELL_EXACT_OUT,
  BUY_EXACT_IN,
}

// 2026-09-27, Phase 4 — added for portable ExchangeButton.tsx presentation shell.
// Byte-identical to the web app's lib/structure/enums/enums.ts BUTTON_TYPE.
export enum BUTTON_TYPE {
  API_TRANSACTION_ERROR,
  BUY_ERROR_REQUIRED,
  BUY_TOKEN_REQUIRED,
  CONNECT,
  INSUFFICIENT_BALANCE,
  IS_LOADING_PRICE,
  NO_HARDHAT_API,
  SELL_ERROR_REQUIRED,
  SELL_TOKEN_REQUIRED,
  SWAP,
  TOKENS_REQUIRED,
  UNDEFINED,
  ZERO_AMOUNT,
}
