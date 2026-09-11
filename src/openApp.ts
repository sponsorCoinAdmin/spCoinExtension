import { SPCOIN_APP_URL } from './config';

// Used by sidepanel.ts's "Open" button (2026-09-10: no longer shared with
// background.ts — the extension icon click now opens the side panel
// directly via chrome.sidePanel.setPanelBehavior, not this). Finds an
// already-open tab on the real spCoin web app and focuses it, or opens a
// new one — the existing Next.js UI, unforked, unmoved.
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
