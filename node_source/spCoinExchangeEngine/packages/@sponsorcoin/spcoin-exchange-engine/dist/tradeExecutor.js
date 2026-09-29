// File: tradeExecutor.ts
// Phase 4 — portable trade-execution abstraction (2026-09-26).
//
// The web app's real swap/stake/approve paths (lib/spCoin/swap.tsx,
// lib/spCoin/executeStakeTransactionCore.ts, lib/uniswap/executeUniswapV3Swap.ts)
// all use ethers Contract + Signer directly — a web-app-local
// getConnectedSigner() resolves a wagmi/Merit Wallet ethers Signer, then
// `new Contract(addr, abi, signer)` + method calls produce a receipt.
//
// The extension has NO equivalent Signer (meritSign.ts only handles
// {to, data, value} payloads via POST /api/spCoin/meritConnect/sign). To
// make the swap/stake execution logic live in this engine package as the
// single source of truth across both platforms, the calldata-building
// (ethers Interface, signer-free) stays in the engine, but the actual
// "send + wait for receipt" step is delegated to a TradeExecutor
// implementation each platform supplies.
//
// Shape mirrors the display/confirmation fields on GetConnectedSignerParams —
// label/contractAddress/tokens/amount/accounts/title — so the real
// approval panel wiring (TransactionConfirmPanel, Merit approval prompt)
// gets the same data the web app already passes through today.
// skipMandatoryApprovalGate + manualAdvanceDebug + interactive + background
// carry the 2026-09-07 re-purposed approval-gate policy forward unchanged.
//
// 2026-09-26 — Type definitions live in spcoin-common to break the circular
// import that existed when @sponsorcoin/spcoin-onchain imported these types
// from this engine package (engine re-exports onchain modules, onchain
// imported types from engine → circular .d.ts resolution → TS5055).
// Re-exported here for backward compatibility — consumers that import
// TradeExecutor types from @sponsorcoin/spcoin-exchange-engine continue
// to work without changes.
export {};
