// File: src/standalone/index.ts
//
// 2026-11-18 -- the stand-alone wallet's public entry: @sponsorcoin/merit-wallet/standalone (docs/design/standAloneWalletInstall.txt).
export { default as MeritWalletStandalone } from './MeritWalletStandalone';
export { createStandaloneWallet, STANDALONE_AUTO_LOCK_MS } from './createStandaloneWallet';
export { createStandaloneSend } from './standaloneSend';
export { useStandaloneApproval } from './useStandaloneApproval';
export { registerStandaloneDebug, endpointForDump } from './registerStandaloneDebug';
export { meritDebug } from '../debug/debugStore';
export { registerStandaloneEngineHosts } from './registerStandaloneEngineHosts';
export { registerStandaloneData } from './registerStandaloneData';
export { default as StandaloneProviders } from './StandaloneProviders';
