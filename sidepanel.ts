import React from 'react';
import { createRoot } from 'react-dom/client';
import { WalletHeader } from '@sponsorcoin/spcoin-panels';
import { openOrFocusApp } from './src/openApp';

const openButton = document.getElementById('open-app');

// 2026-09-10, on request (switch from a persistent window to a real
// Chrome side panel — see background.ts's own comment for the full
// reasoning). chrome.sidePanel.close() is the side-panel equivalent of
// window.close() (which doesn't apply here; a side panel isn't a
// separate window object) — confirmed against the official API
// reference. Requires Chrome 141+; caught rather than thrown on an older
// browser, since failing to auto-close silently is a far smaller problem
// than an uncaught rejection breaking the click handler entirely.
const closeSidePanel = () => {
  void chrome.sidePanel
    .close({ windowId: chrome.windows.WINDOW_ID_CURRENT })
    .catch((error) => console.error('Failed to close side panel:', error));
};

openButton?.addEventListener('click', () => {
  void openOrFocusApp().then(() => closeSidePanel());
});

// 2026-09-11 — the real, portable WalletHeader (see docs/design/
// extensionPlan.md's "Pages Grey header bar" section), replacing the
// hand-written <header> this file used to mount by hand. No JSX here
// deliberately — React.createElement keeps this a plain .ts file, so
// nothing in tsconfig.json/vite.config.ts needs a JSX transform just for
// this one mount point. onRefresh/onTitleClick intentionally omitted for
// now (on request — "we do not have to think of sync at this state"):
// this is a visual/structural slice only, not wired to any real wallet
// state yet.
//
// iconSrc/titleBadgeSrc: WalletHeader's own defaults point at the web
// app's `/assets/miscellaneous/...` — an absolute, page-relative path
// that only resolves against sponsorcoin.org's own origin. Inside the
// extension (chrome-extension://<id>/...) that 404s silently, showing as
// two broken/blank squares in the grey bar — exactly why those props
// exist (see WalletHeader.tsx's own doc comment). chrome.runtime.getURL
// turns the bundled icon into a real, resolvable extension URL.
const iconUrl = chrome.runtime.getURL('icons/icon48.png');
const headerRoot = document.getElementById('header-root');
if (headerRoot) {
  createRoot(headerRoot).render(
    React.createElement(WalletHeader, {
      mode: 'normal',
      iconSrc: iconUrl,
      titleBadgeSrc: iconUrl,
      onClose: closeSidePanel,
    }),
  );
}
