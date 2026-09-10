// Phase 1, tab-opener half (spcoin-nextjs-front-end's
// docs/design/extensionPlan.md, "2026-09-09" section). The real
// open/focus-tab logic lives in openApp.ts, shared with popup.ts's "Open"
// button — this file's own chrome.action.onClicked listener is DEAD as of
// the popup UI (manifest.json's action.default_popup): once a popup is
// set, Chrome always opens it on click and never dispatches onClicked at
// all. Kept only as a harmless fallback for a future manifest state with
// no popup (e.g. if the popup is ever removed again) — not reachable
// today. No other background/service-worker logic exists yet; reserved
// for Phase 2a (background-owned sync/signing) per extensionPlan.md.
import { openOrFocusApp } from './openApp';

chrome.action.onClicked.addListener(() => {
  void openOrFocusApp();
});
