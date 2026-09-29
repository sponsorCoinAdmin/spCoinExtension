// File: uniswap/addresses.ts
// Portable Uniswap V3 contract addresses per chain (2026-09-26, Phase 4).
// Ported from web-app-local lib/uniswap/addresses.ts — pure data, zero
// app-specific coupling.

/** Address of the native-token sentinel used throughout this app — Uniswap
 *  V3 pools only pair real ERC-20s, so the quote/execute sides substitute
 *  the wrapped-native address (below) for this sentinel before any
 *  pool-lookup or router-call. */
export const NATIVE_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

/** Native-token sentinel per chain — this app only configures/trades on a
 *  fixed, known set of chains, so a static table beats runtime probing.
 *  All chains use the same sentinel address; the per-chain keys exist
 *  only so callers can validate the chain is one this app actually supports
 *  before treating a token as native. */
const NATIVE_TOKEN_ADDRESSES: Record<number, string> = {
  1: NATIVE_TOKEN_ADDRESS,
  137: NATIVE_TOKEN_ADDRESS,
  56: NATIVE_TOKEN_ADDRESS,
  10: NATIVE_TOKEN_ADDRESS,
  42161: NATIVE_TOKEN_ADDRESS,
  8453: NATIVE_TOKEN_ADDRESS,
  11155111: NATIVE_TOKEN_ADDRESS,
  31337: NATIVE_TOKEN_ADDRESS,
};

/**
 * Check if the provided address is a native token address for the given chain.
 */
export function isNativeToken(address?: string, chainId?: number): boolean {
  if (!address || !chainId) return false;
  const nativeAddress = NATIVE_TOKEN_ADDRESSES[chainId];
  if (!nativeAddress) return false;
  return address.toLowerCase() === nativeAddress.toLowerCase();
}

export interface UniswapV3ChainAddresses {
  factory: string;
  positionManager: string;
  swapRouter02: string;
  quoterV2: string;
}

const ETH_POLYGON_CANONICAL_FACTORY = '0x1F98431c8aD98523631AE4a59f267346ea31F984';
const ETH_POLYGON_CANONICAL_POSITION_MANAGER = '0xC36442b4a4522E871399cDD485E0e4C7bD8665Fc45';

const BASE_FACTORY = '0x33128a8fC17869897dcE68Ed026d694621f6FDfD';
const BASE_POSITION_MANAGER = '0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1';

const UNISWAP_V3_ADDRESSES: Record<number, UniswapV3ChainAddresses> = {
  1: {
    factory: ETH_POLYGON_CANONICAL_FACTORY,
    positionManager: ETH_POLYGON_CANONICAL_POSITION_MANAGER,
    swapRouter02: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21BF9697530B21e',
  },
  137: {
    factory: ETH_POLYGON_CANONICAL_FACTORY,
    positionManager: ETH_POLYGON_CANONICAL_POSITION_MANAGER,
    swapRouter02: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21BF9697530B21e',
  },
  8453: {
    factory: BASE_FACTORY,
    positionManager: BASE_POSITION_MANAGER,
    swapRouter02: '0x2626664c2603336E57B271c5C0b26F421741e481',
    quoterV2: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
  },
  11155111: {
    factory: '0x0227628f3F023bb0B980b67D528571c95c6DaC1c',
    positionManager: '0x1238536071c2677a632429e3655c799b22cda52',
    swapRouter02: '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E',
    quoterV2: '0xEd1f64733452F45b75F8179591dd5bA1888cf2FB3',
  },
  31337: {
    factory: BASE_FACTORY,
    positionManager: BASE_POSITION_MANAGER,
    swapRouter02: '0x2626664c2603336E57B271c5C0b26F421741e481',
    quoterV2: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
  },
};

export const UNISWAP_V3_FEE_TIERS = {
  LOWEST: 100,
  LOW: 500,
  MEDIUM: 3000,
  HIGH: 10000,
} as const;

export function isUniswapV3VerifiedChainId(chainId: number): boolean {
  return chainId in UNISWAP_V3_ADDRESSES;
}

export function getUniswapV3Addresses(chainId: number): UniswapV3ChainAddresses | undefined {
  return UNISWAP_V3_ADDRESSES[chainId];
}

const WRAPPED_NATIVE_ADDRESSES: Record<number, string> = {
  1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  137: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
  8453: '0x4200000000000000000000000000000000000006',
  11155111: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6b14',
  31337: '0x4200000000000000000000000000000000000006',
};

export function getWrappedNativeAddress(chainId: number): string | undefined {
  return WRAPPED_NATIVE_ADDRESSES[chainId];
}

/**
 * Substitutes the chain's wrapped-native address for the native-ETH
 * sentinel — shared by both getUniswapV3Quote.ts (pool lookups) and
 * executeUniswapV3Swap.ts (the actual swap call), so they can never drift
 * apart on this. Non-native addresses pass through unchanged.
 */
export function toPoolTokenAddress(address: string, chainId: number): string {
  if (!isNativeToken(address, chainId)) return address;
  const wrapped = getWrappedNativeAddress(chainId);
  if (!wrapped) {
    throw new Error(`No wrapped-native address on file for chain ${chainId} — see uniswap/addresses.ts.`);
  }
  return wrapped;
}
