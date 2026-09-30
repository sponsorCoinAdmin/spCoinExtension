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
//
// 2026-09-21, Path A — `activeTab` REMOVED from here. Now that
// MeritWallet.tsx's activeTab is derived from the real
// @sponsorcoin/spcoin-exchange-engine (usePanelTree's activeMainOverlay,
// see MeritWallet.tsx's own Path-A comments), that engine's own
// displayPanels persistence already survives a side-panel close/reopen on
// its own — LiteExchangeProvider's default storage extension is real
// `window.localStorage`, which (unlike a service worker) a side panel's
// own DOM document genuinely has, scoped to this extension's own stable
// chrome-extension://<id> origin — reasoned from the read-storage/
// write-extension code directly, not live-tested (no browser-automation
// tool available this session, see docs/npmMigrationDesign.md's own
// verification notes). Keeping a second, separately-written
// chrome.storage.local copy of the exact same fact would just be two
// sources of truth for "which tab was last active" instead of one —
// exactly the duplication Path A's whole point was to remove. `menuOpen`
// stays here: it has no real-engine equivalent, still genuinely
// local-only UI state.

const STORAGE_KEY = 'spcoin_merit_wallet_ui';

export interface MeritWalletUiState {
  menuOpen: boolean;
}

const DEFAULT_STATE: MeritWalletUiState = {
  menuOpen: true,
};

export async function readMeritWalletUiState(): Promise<MeritWalletUiState> {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const value = stored[STORAGE_KEY] as Partial<MeritWalletUiState> | undefined;
  if (!value || typeof value !== 'object') return DEFAULT_STATE;
  const menuOpen = typeof value.menuOpen === 'boolean' ? value.menuOpen : DEFAULT_STATE.menuOpen;
  return { menuOpen };
}

export async function writeMeritWalletUiState(patch: Partial<MeritWalletUiState>): Promise<void> {
  const current = await readMeritWalletUiState();
  await chrome.storage.local.set({ [STORAGE_KEY]: { ...current, ...patch } });
}
