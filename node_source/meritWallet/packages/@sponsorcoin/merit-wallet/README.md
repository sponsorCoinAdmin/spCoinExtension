# @sponsorcoin/merit-wallet

The Merit Wallet component, shared by the web app, the browser extension and later the phone apps.

Status (2026-10-08): created by moving `MeritWallet.tsx` out of `@sponsorcoin/spcoin-panels`, unchanged apart from its imports.
It depends on `@sponsorcoin/spcoin-panels` (peer dependency). The plan for merging the web and extension wallets into this one component
is in `docs/meritWalletNpmDesignToDo.txt` of the web app repo.

Build: `npm run build` (tsc, output in `dist/`, which is tracked like the other packages).
