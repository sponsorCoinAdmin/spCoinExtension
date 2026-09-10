import { SPCOIN_APP_URL } from './config';

// Shared by background.ts (kept as a fallback for a future manifest state
// with no popup) and popup.ts's "Open" button. Finds an already-open tab
// on the real spCoin web app and focuses it, or opens a new one — the
// existing Next.js UI, unforked, unmoved.
export async function openOrFocusApp(): Promise<void> {
  const existing = await chrome.tabs.query({ url: `${SPCOIN_APP_URL}/*` });
  const found = existing[0];

  if (found?.id !== undefined) {
    await chrome.tabs.update(found.id, { active: true });
    if (found.windowId !== undefined) {
      await chrome.windows.update(found.windowId, { focused: true });
    }
    return;
  }

  await chrome.tabs.create({ url: SPCOIN_APP_URL });
}
