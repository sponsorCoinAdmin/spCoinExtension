// File: src/claimBrowserStorage.ts
//
// 2026-11-20 (owner: "I can log in with a wrong password to get 'Incorrect password', but the correct password does nothing"): a browser keeps localStorage PER ADDRESS, and https://sponsorcoin.org used to be the web app. The web app saved which screens were open under the name
// spcoin-display-stack-v2, and the wallet reads that same name. A list left over from the old web app (it included the password screen) kept the wallet on its login screen even after the right password unlocked the vault. Nothing in the wallet's own saved data is at fault.
// So the first time the wallet runs at an address, it removes every localStorage entry that is not its own (its own are named merit.*: the saved display size, the debug switch, this marker) and records that it did. The vault is not in localStorage (it is in IndexedDB), so no wallet or key is touched.
const OWNER_KEY = 'merit.storageOwner.v1';
const OWNER = 'merit-wallet';

/** Run once before anything reads localStorage. Safe to call again: it does nothing after the first time. Returns the names it removed (for the debug log). */
export function claimBrowserStorage(): string[] {
  const removed: string[] = [];
  try {
    const store = window.localStorage;
    if (store.getItem(OWNER_KEY) === OWNER) return removed;
    const foreign: string[] = [];
    for (let i = 0; i < store.length; i++) {
      const key = store.key(i);
      if (key && !key.startsWith('merit.')) foreign.push(key);
    }
    for (const key of foreign) {
      store.removeItem(key);
      removed.push(key);
    }
    store.setItem(OWNER_KEY, OWNER);
  } catch {
    /* storage unavailable: the wallet runs without saved screen state */
  }
  return removed;
}
