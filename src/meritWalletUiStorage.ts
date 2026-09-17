// File: src/meritWalletUiStorage.ts
// 2026-09-14, on request ("persist the merit wallet") — MeritWallet.tsx's
// own activeTab/menuOpen state (@sponsorcoin/spcoin-panels) is plain
// in-memory useState, reset to its defaults (Swap tab, menu open) on every
// mount. That's invisible in the real web app (a normal SPA route change
// never unmounts it), but a Chrome side panel's whole document — this
// script included — is torn down when the user closes the panel and
// recreated from scratch the next time they open it, unlike a persistent
// background page. Without this, every close/reopen silently dropped you
// back on Swap regardless of which tab you'd actually been using.
//
// Same chrome.storage.local approach as openTargetStorage.ts, and for the
// same reason: this is a chrome-extension:// page with no access to the
// web app's own localStorage-based persistence
// (spcoin-nextjs-front-end/lib/spCoinWallet/meritWalletStorage.ts) even if
// it wanted to reuse that pattern verbatim — different origin entirely.

import type { MenuTabKey } from '@sponsorcoin/spcoin-panels';

const STORAGE_KEY = 'spcoin_merit_wallet_ui';

export interface MeritWalletUiState {
  activeTab: MenuTabKey;
  menuOpen: boolean;
}

const DEFAULT_STATE: MeritWalletUiState = {
  activeTab: 'SWAP',
  menuOpen: true,
};

const VALID_TABS: readonly MenuTabKey[] = ['SWAP', 'SEND', 'SPONSOR', 'REWARDS', 'CONFIG'];

export async function readMeritWalletUiState(): Promise<MeritWalletUiState> {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const value = stored[STORAGE_KEY] as Partial<MeritWalletUiState> | undefined;
  if (!value || typeof value !== 'object') return DEFAULT_STATE;
  const activeTab = value.activeTab && VALID_TABS.includes(value.activeTab) ? value.activeTab : DEFAULT_STATE.activeTab;
  const menuOpen = typeof value.menuOpen === 'boolean' ? value.menuOpen : DEFAULT_STATE.menuOpen;
  return { activeTab, menuOpen };
}

export async function writeMeritWalletUiState(patch: Partial<MeritWalletUiState>): Promise<void> {
  const current = await readMeritWalletUiState();
  await chrome.storage.local.set({ [STORAGE_KEY]: { ...current, ...patch } });
}
