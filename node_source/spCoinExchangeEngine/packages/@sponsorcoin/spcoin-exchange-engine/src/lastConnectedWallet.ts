// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/lastConnectedWallet.ts
//
// 2026-09-18 — moved from the parent app's
// lib/structure/exchangeContextCore/lib-accounts/lastConnectedWallet.ts
// (Phase B.2, wagmi-independent slice — see the approved plan at
// .claude/plans/warm-questing-cookie.md). Genuinely portable as-is: three
// plain functions, zero wagmi/React dependency. Two adaptations from the
// original:
//   - Storage is now injectable (optional `{read, write}` params per call,
//     same shape as displayStackStore.tsx's DisplayStackProvider `storage`
//     prop), defaulting to a small self-contained window.localStorage
//     implementation instead of a hard cross-package import of the web
//     app's own lib/cache/localStorageCache.ts.
//   - isSameConnectedWallet's address normalization no longer goes through
//     accountAddress.ts's normalizeAccountAddressKey (which pulls in viem's
//     isAddress plus a disk-path helper this package doesn't otherwise
//     need) — a local lowercase+trim normalize instead, matching the
//     engine's own existing `lower()` helper convention
//     (exchangeContextContract.ts). Same effective behavior: both reduce
//     to case-insensitive string comparison for this call site.

const LAST_CONNECTED_WALLET_LS_KEY = 'spCoinLastConnectedWalletAddress';

export interface LastConnectedWalletStorage {
  read: (key: string) => string | null;
  write: (key: string, value: string | undefined) => void;
}

function defaultRead(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function defaultWrite(key: string, value: string | undefined): void {
  if (typeof window === 'undefined') return;
  try {
    if (value === undefined) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // Degrade silently — quota or unavailable, same as every prior call site.
  }
}

const DEFAULT_STORAGE: LastConnectedWalletStorage = { read: defaultRead, write: defaultWrite };

/** The wagmi-connected wallet address observed at the end of the previous session,
 *  used to tell "same wallet reconnecting after a refresh" apart from "a different
 *  wallet/account just connected" — only the latter should override a manually
 *  selected accounts.activeAccount. */
export function getLastConnectedWalletAddress(
  storage: LastConnectedWalletStorage = DEFAULT_STORAGE,
): string | undefined {
  const raw = storage.read(LAST_CONNECTED_WALLET_LS_KEY);
  return raw ? raw.trim() || undefined : undefined;
}

export function setLastConnectedWalletAddress(
  address: string | undefined,
  storage: LastConnectedWalletStorage = DEFAULT_STORAGE,
) {
  // Matches the original's `!address` check exactly — an empty string
  // removes, same as undefined, not a literal empty-string write.
  storage.write(LAST_CONNECTED_WALLET_LS_KEY, address || undefined);
}

function normalizeKey(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

export function isSameConnectedWallet(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  return normalizeKey(a) === normalizeKey(b);
}
