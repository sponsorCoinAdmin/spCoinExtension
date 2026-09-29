# @sponsorcoin/spcoin-feeds

Real data feeds for `MeritWallet` (`@sponsorcoin/spcoin-panels`), which runs
today on hardcoded sample data. Three domain subpaths, each with real
fetchers against the app's actual API routes/static assets, a small
in-memory TTL cache, and mappers to `spcoin-panels`' own placeholder UI
shapes:

- **`@sponsorcoin/spcoin-feeds/accounts`** — the Merit Wallet keystore
  (`GET`/`POST`/`DELETE /api/spCoin/lab/networks/{chainId}/testAccounts`)
  plus per-address metadata (`GET /assets/accounts/{address}/account.json`).
  `fetchAccountListGroups` composes both into `AccountListCard`'s real
  group shape.
- **`@sponsorcoin/spcoin-feeds/tokens`** — `GET`/`POST /api/spCoin/tokens`
  (paginated, batch lookup by address). `toAssetListEntries` maps to
  `AssetListTable`'s row shape. No write function — no endpoint exists to
  wrap; not invented here.
- **`@sponsorcoin/spcoin-feeds/networks`** — a static catalog mirroring
  `lib/wagmi/wagmiConfig.ts`'s configured chains (no dedicated API exists).
  No write function — switching the active network is a wagmi/wallet-
  connector concern, deliberately out of this feed's scope.

## What this deliberately does not do

Every mapper (`fetchAccountListGroups`, `toAssetListEntries`,
`toNetworkListEntries`) returns **data only** — no `onSelect`/`onInfoClick`/
`icon`/`badge`/`authSource` fields, which are UI-layer concerns
`spcoin-panels`' own row types already separate out. Wiring this package
into `MeritWallet.tsx` in place of its current `SAMPLE_*` data is a
deliberate, separate next step, not done here — per the plan that produced
this package, these three feeds need to work standalone first.

## Why no dependency on `@sponsorcoin/spcoin-common`

None of these three domains need its canonical types (`TokenContract`,
`NetworkElement`, `Accounts`) — each domain here defines its own lighter
shape instead. This is deliberate, not an oversight: `spcoin-common`
carries `wagmi`/`viem` as peer dependencies, which pull in their full
connector ecosystem (`@wagmi/connectors`, `@metamask/sdk`, WalletConnect —
confirmed to add ~500 packages and an 850kB+ bundle chunk to a consumer
that installs it). This package stays free of that weight entirely.

## Config

Every fetcher takes an optional `{ baseUrl?: string }` — defaults to `''`
(same-origin, the web app's own case); a future non-web-app consumer (e.g.
the browser extension) passes an absolute origin instead.
