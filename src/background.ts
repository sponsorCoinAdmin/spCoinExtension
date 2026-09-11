// Phase 1 (spcoin-nextjs-front-end's docs/design/extensionPlan.md,
// "2026-09-09" section). Real open/focus-tab logic for the "Open" button
// lives in openApp.ts.
//
// 2026-09-10, on direct request — third iteration of the click behavior
// today: default_popup (Chrome auto-closes on any outside click, no
// override possible) -> a real chrome.windows.create window (fixed the
// close-on-outside-click problem, but can't stay above other windows —
// chrome.windows' alwaysOnTop is read-only, confirmed against the
// official API reference, no writable equivalent exists) -> this, a real
// Chrome side panel. Docked into the browser's own UI rather than a
// separate window, so it isn't covered by other windows and doesn't
// auto-close on an outside click either — the actual right tool for
// "always-available companion panel," not a workaround.
//
// setPanelBehavior configures FUTURE action-icon clicks to open the side
// panel directly; it's set up once here, not called per-click the way
// the previous onClicked handler was. Chrome dispatches no onClicked at
// all once this is set (same "the click is spoken for elsewhere" pattern
// default_popup used to cause, this time by design and without that
// version's downside).
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error('Failed to set side panel behavior:', error));
