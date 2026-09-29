# @sponsorcoin/spcoin-common

Shared, framework-agnostic `ExchangeContext` types and panel-visibility
enums/registry, extracted from `spcoin-nextjs-front-end` so the web app,
the future Merit Wallet browser extension, and (conditionally) a future
phone app can share one canonical source instead of hand-duplicated
copies.

Full design record: `../../../../../docs/design/spcoinPackagesDesign.md`
in the parent app repo (this package now lives at
`node_source/spCoinCommon/packages/@sponsorcoin/spcoin-common/`, one
level deeper than when this note was first written). Read that doc
before changing this package's scope —
it records what's deliberately excluded (React hooks/Providers,
business logic) and why.

## Subpaths

- `@sponsorcoin/spcoin-common/context` — `ExchangeContext`, `Settings`,
  `APICoreSyncedMembers`, `Accounts`, `NetworkElement`, `TokenContract`,
  and related types/enums (`STATUS`, `TRADE_DIRECTION`, `FEED_TYPE`).
- `@sponsorcoin/spcoin-common/panels` — the `SP_COIN_DISPLAY` enum, the
  derived panel-group constants (`MAIN_RADIO_OVERLAY_PANELS` and
  friends), `panelRegistry.ts`'s static structure (`PANEL_DEFS`,
  `CHILDREN`, `PARENT_OF`, `ROOTS`), the canonical default panel tree,
  and pure panel-tree helper functions.

## Status

Source copied in from the parent app 2026-09-06 (step 3 of the build
plan in `spcoinPackagesDesign.md` §4). Not yet built/typechecked in
isolation (step 4), not yet consumed by the parent app (step 5), not
yet published (step 8). Treat this as a snapshot copy, not the live
source of truth, until step 5 repoints a real consumer at it.
