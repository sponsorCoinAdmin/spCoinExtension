# @sponsorcoin/spcoin-hooks

Portable React hooks shared between `spcoin-nextjs-front-end` and the Merit
Wallet browser extension (`spCoinExtension`).

Deliberately separate from `@sponsorcoin/spcoin-lib`: this package declares
`react` as a peer dependency and holds hooks specifically; `spcoin-lib`
stays framework-agnostic (plain functions, no React dependency at all), so
nothing that only needs a small utility is ever forced to carry React as a
dependency transitively.

Empty as of 2026-09-11, on purpose — hooks land here once they're actually
being built for a real consumer, not speculatively ahead of one.
