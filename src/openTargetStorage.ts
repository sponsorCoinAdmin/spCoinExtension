// File: src/openTargetStorage.ts
// 2026-09-14, on request — the "Open" button (sidepanel.ts) always opened
// a URL baked in at build time from .env.production's VITE_APP_URL
// (https://sponsorcoin.org) and couldn't be changed short of rebuilding
// with a different env. This gives it a real, persisted runtime toggle
// instead: "Local" (always http://localhost:3000, regardless of build) or
// "Prod" (always https://sponsorcoin.org, regardless of build) — a fixed,
// explicit choice between exactly two known origins, not a build-env
// fallback, which is why PROD_APP_URL below is a literal rather than
// reading VITE_APP_URL: the whole point of this toggle is that "Prod"
// reliably means sponsorcoin.org regardless of whatever a build env
// happens to be set to. (2026-09-17 — the file that used to hold a
// VITE_APP_URL-driven `SPCOIN_PROD_APP_URL` constant, src/config.ts, was
// deleted as dead code; nothing here ever actually imported it — this
// toggle's own PROD_APP_URL fully superseded it, coincidentally equal in
// value but independent in source.)
//
// Persisted via chrome.storage.local (not the web app's own localStorage
// pattern, e.g. meritWalletStorage.ts's updateMeritWalletLS) — this is a
// chrome-extension:// page, not a sponsorcoin.org/localhost:3000 page, so
// it has no access to either origin's localStorage. chrome.storage.local
// is this extension's own equivalent: persists across side panel
// open/close and browser restarts, scoped to this extension only. Requires
// the "storage" permission (manifest.json).

export type OpenTarget = 'local' | 'prod';

const STORAGE_KEY = 'spcoin_open_target';

const LOCAL_APP_URL = 'http://localhost:3000';
const PROD_APP_URL = 'https://sponsorcoin.org';

// Prod is the default — matches this button's existing, always-sponsorcoin.org
// behavior until someone deliberately flips it to Local.
const DEFAULT_TARGET: OpenTarget = 'prod';

export async function readOpenTarget(): Promise<OpenTarget> {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const value = stored[STORAGE_KEY];
  return value === 'local' || value === 'prod' ? value : DEFAULT_TARGET;
}

export async function writeOpenTarget(target: OpenTarget): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: target });
}

export function urlForOpenTarget(target: OpenTarget): string {
  return target === 'local' ? LOCAL_APP_URL : PROD_APP_URL;
}

// 2026-11-04 (owner decision): the ONE answer to "which server does the extension read from and publish to?" is the Local/Prod setting above. Every server read asks getServerUrl(), which is synchronous and always the current setting; nothing keeps a copy of the address.
// The panel starts it once with the stored value (initServerSetting); a change made from the Config tab, or by any other page of the extension, arrives through chrome.storage and is announced to onServerChange listeners.
let currentTarget: OpenTarget = DEFAULT_TARGET;
const serverListeners = new Set<() => void>();

export function getServerUrl(): string {
  return urlForOpenTarget(currentTarget);
}

/** For code with no running panel (the service worker, the relay): the setting as stored right now. */
export async function readServerUrl(): Promise<string> {
  return urlForOpenTarget(await readOpenTarget());
}

export function onServerChange(listener: () => void): () => void {
  serverListeners.add(listener);
  return () => serverListeners.delete(listener);
}

export function setServerTarget(target: OpenTarget): void {
  if (target === currentTarget) return;
  currentTarget = target;
  serverListeners.forEach((listener) => listener());
}

export function initServerSetting(initial: OpenTarget): void {
  currentTarget = initial;
  chrome.storage.onChanged.addListener((changes, area) => {
    const next = changes[STORAGE_KEY]?.newValue;
    if (area === 'local' && (next === 'local' || next === 'prod')) setServerTarget(next);
  });
}
