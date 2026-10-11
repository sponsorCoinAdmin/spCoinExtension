// File: src/ActiveSpCoinLoader.ts
//
// 2026-10-11 (docs/nodeSourceMigrationPlan.txt row 13, task 3): fills the exchange context's active spCoin (its address and metadata: name, symbol, decimals, rate ranges and increments) the same way
// the web app does, with the engine's useActiveSpCoin. The extension's bundle answers the chain's active-spCoin file (no request to any app) and the contract's own fields are read through the chain
// client registered in engineHosts.ts. No UI of its own; mounted inside the provider.
import { useActiveSpCoin } from '@sponsorcoin/spcoin-exchange-engine';

export function ActiveSpCoinLoader(): null {
  useActiveSpCoin();
  return null;
}
