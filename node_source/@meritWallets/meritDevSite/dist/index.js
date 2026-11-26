// File: src/index.ts
//
// @meritWallets/meritDevSite (2026-11-19): everything that exists only to TEST the Merit Wallet. It lives in the test project (spcoin-nextjs-front-end) and never in a release: the release repo (merit-wallet) must not contain this folder, import it or depend on it,
// and its build fails if it does. Today: the Test Accounts section and its browser API. Planned: the Hardhat test chain's network settings, data and logos, and the window.__ test probes.
export { default as TestAccountsSection } from './TestAccountsSection';
export { createBrowserTestAccounts } from './createBrowserTestAccounts';
export { default as TestSitesSection } from './TestSitesSection';
export * from './testSites';
export { openSavedTestSiteWindow, openTestSiteWindow, installTestSiteListener, readSavedTestSiteForm } from './testSiteWindows';
