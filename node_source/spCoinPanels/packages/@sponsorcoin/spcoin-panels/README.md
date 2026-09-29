# @sponsorcoin/spcoin-panels

Merit Wallet's own, independent panel-visibility engine: a plain pub/sub
store (`meritPanelState`), a `useSyncExternalStore`-based read hook
(`usePanelVisible`), and a gating component (`MeritPanelGate`) — with a
single write chokepoint (`setPanelVisible`) and zero dependency on
spcoin-nextjs-front-end's `ExchangeContext`. See
`spcoin-nextjs-front-end/docs/design/extensionPlan.md` §7 for the full
design/reasoning.

## What's actually published here

Only `src/` — `panelState.ts`, `usePanelVisible.ts`, `MeritPanelGate.tsx`,
`index.ts`. Those four files are genuinely portable: their only external
import is `SP_COIN_DISPLAY` from `@sponsorcoin/spcoin-common/panels` (already
published), plus `react`.

`node_source/spCoinPanels/AssetSelectDropDowns/` (a sibling of this
`packages/` folder, one level up) is **not** part of this package and is
**not** portable yet: every file in it imports directly from the web app's
own `@/lib/...` and `@/components/...` tree (`usePanelTree`, `PanelGate`,
`useOpenActiveListPanel`, `useSelectionCommit`, and others) — real
app-internal dependencies, not something a `tsconfig.json`/`package.json`
can paper over. Decoupling those the same way this package's own `src/` was
already decoupled is a separate, much larger effort (on the order of the
original panel-extraction work itself, not a rename) — tracked, not
attempted here.

Moved into this `packages/@sponsorcoin/spcoin-panels/` shape from a flat
`node_source/spCoinPanels/engine/` (2026-09-10, same day) to match the
sibling packages' layout — required by
`app/api/spCoin/access-manager/route.ts`'s `getPackageWorkspaceRoot()`,
which hardcodes `<workspace root>/packages/...`, so this package could be
wired into `SpCoinAccessController`'s "NPM Deployment" upload/download/
install panel like `spcoin-common`/`spcoin-lib`/`spcoin-access-modules`
already are.

## Build

```
npm run build      # tsc -p tsconfig.json  ->  dist/
npm run typecheck   # tsc --noEmit -p tsconfig.json
```

## Publish

Not yet run from this repo — needs an npm auth token supplied by the
package owner. Once available: `npm publish --access public` from this
directory after `npm run build`.
