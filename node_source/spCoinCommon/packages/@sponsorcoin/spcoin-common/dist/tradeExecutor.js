"use strict";
// File: spCoinCommon/src/tradeExecutor.ts
//
// TradeExecutor interface and related types — shared between
// @sponsorcoin/spcoin-onchain (uses these types in its portable execution
// primitives) and @sponsorcoin/spcoin-exchange-engine (re-exports for
// backward-compatible public API). Defined here in spcoin-common to
// break the circular import that existed when onchain imported these
// types from the engine package (engine → onchain value re-export +
// onchain → engine type import created a circular .d.ts resolution
// chain that triggered TS5055 in both VS Code and tsc builds).
Object.defineProperty(exports, "__esModule", { value: true });
