# @sponsorcoin/merit-wallet

The Merit Wallet component, shared by the web app, the browser extension and later the phone apps.

Status (2026-10-08): created by moving `MeritWallet.tsx` out of `@sponsorcoin/spcoin-panels`, unchanged apart from its imports.
It depends on `@sponsorcoin/spcoin-panels` (peer dependency). The plan for merging the web and extension wallets into this one component
is in `docs/meritWalletNpmDesignToDo.txt` of the web app repo.

Build: `npm run build` (tsc, output in `dist/`, which is tracked like the other packages).

## Host injectables and defaults

The wallet owns portable defaults where they are safe. Hosts inject the parts that differ by deployment. An empty optional hook or API is not a working implementation: required behavior must be supplied by the host.

| Injectable | Wallet default | What an app overrides it for | Who supplies it today |
| --- | --- | --- | --- |
| `MeritWalletApi` (`session`, `accounts`, `signing`) | `createWallet()` supplies an empty authenticator registry and in-memory active-authenticator selection; it does not create a vault or sign. | Connect the wallet UI to a real vault, accounts, approvals, signing, and transaction transport. | Web: `webWallet` and `webApprovers` backed by wallet state/server routes. Extension: local vault and background worker. |
| `createWallet` registry, default backend, and active-authenticator store | Empty registry; `appDefault` is required; active selection falls back to memory. | Register the host's signers and persist account-to-signer selection. | Web: server keystore authenticator and web default. Extension: local vault authenticator and extension storage. |
| Vault storage and capability | `VaultSession` and `createLocalVault` implement crypto and account operations; the host must provide ciphertext storage. | Choose secure persistence and an unlock lifecycle for the device. | Web uses its server keystore. Extension uses `chrome.storage` through the background worker. |
| `MeritWalletApi.networks` | Network data comes from shared `spcoin-feeds`; wallet selection helpers do not own persistence. | Supply a different network set or persist active-network changes. | Web: shared registry plus app chain selection. Extension: shared registry plus extension chain selection. |
| `WalletDataSource.resolveNetwork` | Shared `spcoin-feeds` resolver when omitted by consumers that use the shared network helper. | Use an app-specific registry. | Web and extension use shared feeds; no separate resolver is currently injected. |
| `WalletDataSource.loadNetworkInfo` | Relative fetch from `/assets/blockchains/<chainId>/info.json` in the panel layer. | Change the asset origin or provide a native/platform data source. | Web uses same-origin assets. Extension supplies its packaged asset base URL. |
| `WalletDataSource.loadTokenRecord` | No loader; token detail can remain partial when no loader is supplied. | Hydrate an address-only token from the app's token registry. | Web supplies its token store loader. Extension currently leaves it unset. |
| `MeritPlatform` | `domPlatform`: browser clipboard, URL opening, file download, localStorage preferences, visibility and focus. | Replace browser operations with native share/storage/lifecycle behavior. | Web and extension use the package default. |
| `walletAssetBaseUrl` | Empty base URL, so assets resolve from the current origin. | Point packaged wallet identity assets at an extension or other app bundle. | Web uses its origin. Extension supplies `chrome.runtime.getURL('')`. |
| Sponsor read cache store | LocalStorage with memory fallback. | Share/cache sponsor totals through an app backend or platform storage. | Web registers the HTTP cache store. Extension uses the local default. |
| Sponsor read transport (`SpCoinReadStepFn`) | HTTP POST to the same-origin `/api/spCoin/run-script` route. | Use a direct RPC client or another route when the host has no web server. | Web uses the default route. Extension injects direct chain RPC. |
| Hosted API base | Enabled by default for engine features that use host API routes. | Disable hosted reads when running without the web server, or select another API base. | Web keeps the same-origin API. Extension disables hosted API calls. |
| Account/profile source | No universal profile backend; package offers account profile UI/client contracts. | Load and persist account labels, profiles, and active account for the host. | Web uses account API/store. Extension uses its local profile adapter and bundled assets. |

These defaults are runtime behavior, not a claim that every host can run without configuration: vault operations, token hydration, and chain reads require their corresponding host implementation. Keep host adapters limited to those real differences; do not copy package defaults into host code.
