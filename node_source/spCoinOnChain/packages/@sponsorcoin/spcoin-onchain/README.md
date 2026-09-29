# @sponsorcoin/spcoin-onchain

Portable on-chain transaction execution primitives (swap, stake, approve) using a signer-agnostic `TradeExecutor` interface.

## Purpose

This package extracts the swap/stake/ERC20-execution logic from the web app's `lib/spCoin/` and `lib/uniswap/` layers into a shared NPM package. It depends on `@sponsorcoin/spcoin-exchange-engine` for the `TradeExecutor` interface, which each platform supplies with their own signing implementation:

- **Web app**: wraps `getConnectedSigner()` (wagmi/Merit Wallet ethers Signer)
- **Extension**: wraps `meritSign.ts` (POST `/api/spCoin/meritConnect/sign`)
- **Mobile**: (future) wraps viem/ethers Mobile wallet connector

## TradeExecutor Abstraction

The `TradeExecutor` interface separates calldata-building (done in this package using viem's `encodeFunctionData`, signer-free) from the actual signing+sending+receipt-wait (platform-specific, injected via the interface).

See `tradeExecutor.ts` in `@sponsorcoin/spcoin-exchange-engine` for the interface definition.

## Modules

### `trade/executeErc20Approve`
ERC20 `approve()` with allowance pre-check — stage 1 of SPONSOR mode's swap-then-stake flow.

### `trade/executeUniswapV3Swap`
Uniswap V3 `SwapRouter02.exactInputSingle` — single-hop swap with native-ETH support.

### `trade/executeMultiHopUniswapV3Swap`
Uniswap V3 `SwapRouter02.exactInput` — multi-hop through WETH with encoded path.

### `trade/executeStakeTransactionCore`
spCoin staking — `sponsorAgentTransaction` / `sponsorRecipientTransaction` with rate-key resolution.

### `uniswap/addresses`
Per-chain Uniswap V3 contract addresses, fee tiers, wrapped-native addresses, and token-address substitution helpers.

### `uniswap/abi`
Minimal ABI slices for SwapRouter02 and ERC20 operations.

### `uniswap/multiHopPath`
Pure multi-hop path encoding (no chain calls).

## Build

```bash
npm run build
```
