// File: src/displayStackStorage.ts
//
// 2026-09-21, Path A — chrome.storage.local-backed persistence for
// @sponsorcoin/spcoin-exchange-engine's DisplayStackProvider (the real
// panel-tree navigation-stack state), matching the same
// chrome.storage.local reasoning as exchangeContextStorage.ts/
// meritWalletUiStorage.ts/openTargetStorage.ts: this is a
// chrome-extension:// page, different origin from the web app's own
// localStorage-based persistence even if it wanted to reuse that pattern
// verbatim.
//
// Real API mismatch this file exists specifically to bridge:
// DisplayStackProvider's own `storage` prop contract is SYNCHRONOUS
// (`read(key): string | null`, called directly inside a `useState`
// initializer — no `await` possible there), while `chrome.storage.local`
// is inherently async. Same bridge shape `sidepanel.ts` already uses for
// openTargetStorage.ts/meritWalletUiStorage.ts: read the real persisted
// value once, BEFORE the first render (`renderWallet()` already awaits
// its own storage reads there), then hand DisplayStackProvider a
// synchronous closure over that already-resolved value via
// `makeSyncDisplayStackStorage`. `write` stays fire-and-forget async —
// matches DisplayStackProvider's own "best-effort, degrade silently"
// write contract exactly (it doesn't await its own write either, see
// that file's own `useEffect`).

import type { DisplayStackStorage } from '@sponsorcoin/spcoin-exchange-engine';

const STORAGE_KEY = 'spcoin_merit_wallet_display_stack';

export async function readDisplayStackRaw(): Promise<string | null> {
  try {
    const stored = await chrome.storage.local.get(STORAGE_KEY);
    const value = stored[STORAGE_KEY];
    return typeof value === 'string' ? value : null;
  } catch (error) {
    console.error('Failed to read persisted display stack:', error);
    return null;
  }
}

function writeDisplayStackRaw(value: string): void {
  void chrome.storage.local.set({ [STORAGE_KEY]: value }).catch((error) => {
    // Best-effort — matches DisplayStackProvider's own silent-degrade
    // write contract; a failed write just means this session's stack
    // doesn't survive the next side-panel reopen, not a hard failure.
    console.error('Failed to persist display stack:', error);
  });
}

/** Builds a synchronous DisplayStackStorage-shaped {read, write} pair from
 *  an already-resolved persisted value — call readDisplayStackRaw() first
 *  (before the first render, alongside this file's sibling storage reads
 *  in renderWallet()) and pass its result in here. The `key` parameter
 *  DisplayStackProvider's own contract passes to `read`/`write` is
 *  ignored — this file owns its own STORAGE_KEY, independent of whatever
 *  key name the default window.localStorage implementation uses
 *  internally. */
export function makeSyncDisplayStackStorage(preResolvedValue: string | null): DisplayStackStorage {
  return {
    read: () => preResolvedValue,
    write: (_key: string, value: string) => writeDisplayStackRaw(value),
  };
}
