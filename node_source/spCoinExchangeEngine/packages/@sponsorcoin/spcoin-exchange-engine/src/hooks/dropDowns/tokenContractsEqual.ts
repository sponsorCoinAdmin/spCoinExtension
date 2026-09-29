// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/hooks/dropDowns/tokenContractsEqual.ts
//
// 2026-09-21 — moved from the parent app's
// components/shared/utils/isDuplicateAddress.ts (the tokenContractsEqual
// half only; isDuplicateAddress itself stays there — it's used well
// beyond token contracts and isn't specifically part of this move).
// Pure comparison, zero ExchangeContext/wagmi/Next.js coupling — the
// exact kind of dependency useSellTokenContract/useBuyTokenContract need
// to be genuinely portable, not just relocated.

import type { TokenContract } from '@sponsorcoin/spcoin-common/context';

const isDuplicateAddress = (addr1?: string, addr2?: string): boolean =>
  !!addr1 && !!addr2 && addr1.toLowerCase() === addr2.toLowerCase();

/**
 * Returns true if two token contracts refer to the same address and chain,
 * with every other real field also matching. Address comparison is
 * case-insensitive.
 */
export const tokenContractsEqual = (a?: TokenContract, b?: TokenContract): boolean => {
  if (!a || !b) return false;
  if (!isDuplicateAddress(a.address, b.address) || a.chainId !== b.chainId) return false;

  const norm = (value: unknown) =>
    typeof value === 'string' ? value.trim() : '';
  const normNum = (value: unknown, fallback = -1) =>
    typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  const normBigInt = (value: unknown) =>
    typeof value === 'bigint' ? value.toString() : '';
  const normStringArray = (value: unknown) =>
    Array.isArray(value) ? value.map((item) => norm(item)).join('|') : '';

  return (
    norm(a.name) === norm(b.name) &&
    norm(a.symbol) === norm(b.symbol) &&
    normNum(a.decimals) === normNum(b.decimals) &&
    norm(a.logoURL) === norm(b.logoURL) &&
    norm(a.website) === norm(b.website) &&
    norm(a.description) === norm(b.description) &&
    norm(a.infoURL) === norm(b.infoURL) &&
    norm(a.explorer) === norm(b.explorer) &&
    norm(a.research) === norm(b.research) &&
    norm(a.rpc_url) === norm(b.rpc_url) &&
    normNum(a.coin_type) === normNum(b.coin_type) &&
    normStringArray(a.tags) === normStringArray(b.tags) &&
    normBigInt(a.balance) === normBigInt(b.balance) &&
    normBigInt(a.amount) === normBigInt(b.amount)
  );
};
