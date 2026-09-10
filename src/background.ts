// Phase 1, tab-opener half (spcoin-nextjs-front-end's
// docs/design/extensionPlan.md, "2026-09-09" section). Real open/focus-tab
// logic for the "Open" button lives in openApp.ts; real open/focus-window
// logic for the extension icon itself lives in openPopupWindow.ts.
//
// 2026-09-10, on direct request: this listener is ALIVE again (it used to
// be dead — manifest.json's action.default_popup meant Chrome always
// showed its own overlay popup on click and never dispatched onClicked at
// all). default_popup is removed now, specifically so the click can open
// a real, persistent chrome.windows.create window instead — Chrome's
// default_popup overlay force-closes on any outside click with no way to
// override that; a real window doesn't. See openPopupWindow.ts's own
// comment for the full reasoning.
import { openOrFocusPopupWindow } from './openPopupWindow';

chrome.action.onClicked.addListener(() => {
  void openOrFocusPopupWindow();
});
