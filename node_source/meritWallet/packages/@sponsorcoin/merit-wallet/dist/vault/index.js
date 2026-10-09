// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/vault/index.ts
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt, E1) -- the vault on its own, with no React and no UI code: this is what an extension background
// service worker (or any host that holds the keys) imports as @sponsorcoin/merit-wallet/vault, so the worker bundle stays small and never touches
// DOM globals at import time.
export * from './vaultCrypto';
export * from './vaultSession';
export * from './walletAccounts';
export * from './approvals';
export { LocalSigner, DevAccountOnRealChainError, HARDHAT_CHAIN_ID } from './localSigner';
export * from './providerController';
