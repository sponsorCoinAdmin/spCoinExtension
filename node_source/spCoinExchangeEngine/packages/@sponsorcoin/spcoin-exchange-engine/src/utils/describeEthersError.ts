// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/utils/describeEthersError.ts
// 2026-09-25, migrated from spcoin-nextjs-front-end's
// lib/utils/describeEthersError.ts (on request, "migrate CONNECT_TRADE_BUTTON
// ... start with the shared execution primitives"). Genuinely portable —
// zero imports, framework-agnostic by its own original header comment
// (no Node-only imports, safe from client components and server routes
// alike). Byte-identical move; every other CONNECT_TRADE_BUTTON dependency
// investigated this same pass (getConnectedSigner -> meritConnect, a
// 1,872-line security/keystore/approval system the extension has no
// equivalent of yet) is NOT a lightweight primitive and was not moved —
// see docs/npmMigrationDesign.md's own dated entry for the full reasoning.
//
// Ethers v6 errors carry far more diagnostic detail than `.message` exposes
// (shortMessage/reason/code/action/data/invocation/transaction) — surfacing
// only `.message` is why reverts have repeatedly shown up as an opaque
// "execution reverted (unknown custom error)" with no indication of which
// call, contract, or field actually caused it.

export function describeEthersError(error: unknown): string {
  const baseMessage = error instanceof Error ? error.message : String(error);
  if (!error || typeof error !== 'object') return baseMessage;

  const e = error as Record<string, unknown>;
  const parts: string[] = [];

  if (typeof e.shortMessage === 'string' && e.shortMessage) parts.push(`shortMessage=${e.shortMessage}`);
  if (typeof e.reason === 'string' && e.reason) parts.push(`reason=${e.reason}`);
  if (e.code !== undefined) parts.push(`code=${String(e.code)}`);
  if (typeof e.action === 'string' && e.action) parts.push(`action=${e.action}`);
  if (typeof e.data === 'string' && e.data) parts.push(`data=${e.data}`);

  const invocation = e.invocation as Record<string, unknown> | undefined;
  if (invocation && typeof invocation === 'object' && typeof invocation.method === 'string') {
    parts.push(`invocation.method=${invocation.method}`);
  }

  const transaction = e.transaction as Record<string, unknown> | undefined;
  if (transaction && typeof transaction === 'object') {
    parts.push(`tx.to=${typeof transaction.to === 'string' ? transaction.to : '(contract creation)'}`);
    if (typeof transaction.from === 'string') parts.push(`tx.from=${transaction.from}`);
    if (typeof transaction.data === 'string') parts.push(`tx.data.length=${transaction.data.length}`);
  }

  // Nested "error" (ethers wraps the underlying provider/RPC error here,
  // which often has the real revert reason when the outer error doesn't).
  const nested = e.error as Record<string, unknown> | undefined;
  if (nested && typeof nested === 'object') {
    if (typeof nested.message === 'string' && nested.message) parts.push(`error.message=${nested.message}`);
    if (typeof nested.data === 'string' && nested.data) parts.push(`error.data=${nested.data}`);
    if (nested.code !== undefined) parts.push(`error.code=${String(nested.code)}`);
  }

  return parts.length ? `${baseMessage} | ${parts.join(' ')}` : baseMessage;
}

/**
 * Short, human-facing counterpart to describeEthersError's full diagnostic
 * dump — for ErrorMessage.reason (MessagePanel's own prominent "why this
 * happened" row), which wants one clean sentence, not a pipe-delimited
 * key=value list. Prefers ethers' own decoded `reason` (an actual revert
 * string, when the contract provided one), then `shortMessage`, then falls
 * back to the plain `.message` — same priority order describeEthersError
 * already uses internally, just returned as one value instead of appended
 * to a list.
 */
export function extractEthersErrorReason(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') {
    return error instanceof Error ? error.message : undefined;
  }
  const e = error as Record<string, unknown>;
  if (typeof e.reason === 'string' && e.reason) return e.reason;
  if (typeof e.shortMessage === 'string' && e.shortMessage) return e.shortMessage;
  const nested = e.error as Record<string, unknown> | undefined;
  if (nested && typeof nested === 'object' && typeof nested.message === 'string' && nested.message) {
    return nested.message;
  }
  return error instanceof Error ? error.message : undefined;
}

/**
 * Best-effort gas fee for ErrorMessage.gasFee — only meaningful when the
 * failure actually reached broadcast and produced a receipt (a revert after
 * gas was spent), which most write failures in this app never do (rejected
 * before signing, a locked-account error, insufficient funds caught by
 * estimateGas). Returns undefined rather than a misleading "0" when no
 * receipt is available.
 */
export function extractEthersErrorGasFee(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const e = error as Record<string, unknown>;
  const receipt = e.receipt as Record<string, unknown> | undefined;
  const gasUsed = receipt?.gasUsed;
  const gasPrice = receipt?.gasPrice ?? (e.transaction as Record<string, unknown> | undefined)?.gasPrice;
  if (gasUsed === undefined && gasPrice === undefined) return undefined;
  const gasUsedStr = gasUsed !== undefined ? String(gasUsed) : undefined;
  const gasPriceStr = gasPrice !== undefined ? String(gasPrice) : undefined;
  if (gasUsedStr && gasPriceStr) return `${gasUsedStr} gas @ ${gasPriceStr} wei`;
  return gasUsedStr ? `${gasUsedStr} gas` : gasPriceStr ? `${gasPriceStr} wei` : undefined;
}
