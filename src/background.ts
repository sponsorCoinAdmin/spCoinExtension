import { SPCOIN_APP_URL } from './config';

// Phase 1, tab-opener half (spcoin-nextjs-front-end's
// docs/design/extensionPlan.md, "2026-09-09" section). Deliberately
// minimal: no default_popup in manifest.json, so clicking the toolbar
// icon runs this listener instead. It opens/focuses a tab on the real
// spCoin web app — the existing Next.js UI, unforked, unmoved. Nothing
// here duplicates or ports that UI.
//
// Deliberately NOT here yet: EIP-1193/EIP-6963 provider injection (the
// other half of Phase 1 — proves this is a working wallet, not just that
// a tab can be opened), and any key custody/signing logic. Both come
// later, once this shell is proven.
chrome.action.onClicked.addListener(async () => {
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
});
