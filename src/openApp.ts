import { readOpenTarget, urlForOpenTarget } from './openTargetStorage';

// Used by sidepanel.ts's "Open" button (2026-09-10: no longer shared with
// background.ts — the extension icon click now opens the side panel
// directly via chrome.sidePanel.setPanelBehavior, not this). Finds an
// already-open tab on the real spCoin web app and focuses it, or opens a
// new one — the existing Next.js UI, unforked, unmoved.
//
// 2026-09-14, on request ("why does the extension open button always open
// sponsorCoin.org and not localhost:3000") — the target URL used to be
// SPCOIN_APP_URL (config.ts), fixed at build time from .env.production
// (always sponsorcoin.org for any `npm run build`, since that's the same
// build CI ships — see config.ts's own comment). Now reads the persisted
// Local/Prod choice instead (openTargetStorage.ts, set from the wallet's
// own Config tab), so the same built extension can point at either without
// a rebuild.
export async function openOrFocusApp(): Promise<void> {
  const target = await readOpenTarget();
  const appUrl = urlForOpenTarget(target);
  const existing = await chrome.tabs.query({ url: `${appUrl}/*` });
  const found = existing[0];

  if (found?.id !== undefined) {
    await chrome.tabs.update(found.id, { active: true });
    if (found.windowId !== undefined) {
      await chrome.windows.update(found.windowId, { focused: true });
    }
    return;
  }

  await chrome.tabs.create({ url: appUrl });
}
