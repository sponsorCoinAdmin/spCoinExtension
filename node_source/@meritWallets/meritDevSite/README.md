# @meritWallets/meritDevSite

Test-only code for the Merit Wallet. It lives in the test project (`spcoin-nextjs-front-end`) and is **never** part of a release: the release repo (`merit-wallet`) must not contain it, import it, or depend on it.

- `TestAccountsSection`: the Config tab's "Test Accounts" section (load / unload Hardhat's published accounts). The page passes it to the wallet as `configTestAccountsContent`.
- `createBrowserTestAccounts(core)`: its API over a browser wallet's vault.

- `TestSitesSection` (2026-11-24): the Config tab's "Test Sites" section: protocol, host, port, window size and the iframe harness options, the link they build, and an Open button (a popup window). The page passes it to the wallet as `configTestSitesContent`. `testSites.ts` is its pure part (validation and the link), with tests.
