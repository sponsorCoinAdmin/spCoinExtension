# @meritWallets/meritDevOnly

Test-only code for the Merit Wallet. It lives in the test project (`spcoin-nextjs-front-end`) and is **never** part of a release: the release repo (`merit-wallet`) must not contain it, import it, or depend on it.

- `TestAccountsSection`: the Config tab's "Test Accounts" section (load / unload Hardhat's published accounts). The page passes it to the wallet as `configTestAccountsContent`.
- `createBrowserTestAccounts(core)`: its API over a browser wallet's vault.
