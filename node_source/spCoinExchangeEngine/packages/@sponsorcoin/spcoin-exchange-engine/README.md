# @sponsorcoin/spcoin-exchange-engine

Portable ExchangeContext runtime — the provider, read/write hooks, and
cross-process sync client — shared between `spcoin-nextjs-front-end` and the
Merit Wallet browser extension (`spCoinExtension`).

Standalone rather than nested under `@sponsorcoin/spcoin-common`:
`spcoin-common` is deliberately pure types/enums/static panel-tree data with
zero runtime dependencies (so anything can depend on it without weight);
this package is where the actual engine lives instead — a React
`ExchangeProvider`, hooks like `useWebExchangeContext`, and the sync client
that patches shared `ExchangeContext` state (`accounts`/`network`/
`displayPanels`/`displayStack`, per `@sponsorcoin/spcoin-common`'s own
`APICoreSyncedMembers`/`ExchangeContextPatch` types) across processes.
`spcoin-panels` (portable UI) and this engine are both meant to depend on
`spcoin-common` for shape, not on each other.

Empty as of 2026-09-16 through 2026-09-17 (scaffold/wiring step only —
package created, built, registered with the NPM Deployment tool). Real
content landed 2026-09-18, "Phase B.1" of the approved staged plan (see
`.claude/plans/warm-questing-cookie.md` in the parent app repo, and
`docs/npmMigrationDesign.md`'s stage 7 entry): `exchangeContextContract.ts`
— the write/boot/storage extension-point types, the shared
`ExchangeContextState` React.Context object, and three pure helpers
(`ensureNetwork`/`clone`/`lower`). This is the "contract," not the runtime
— the stateful `ExchangeProvider` component itself (still ~1188 lines in
the parent app's `lib/context/ExchangeProvider.tsx`) hasn't moved yet, on
purpose: it has real, unresolved web-app-specific coupling (Next.js-only
account/token hydration API calls, Merit-mimic verification instrumentation,
hardcoded PanelBootstrap/AppBootstrap, un-injected localStorage wallet
memory) that each need their own resolution first — see the approved
plan's "Phase B scope decision" section for the full list. That's tracked
as "Phase B.2," deliberately not started yet.
