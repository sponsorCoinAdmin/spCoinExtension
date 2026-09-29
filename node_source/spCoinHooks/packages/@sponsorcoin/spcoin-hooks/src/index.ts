// File: node_source/spCoinHooks/packages/@sponsorcoin/spcoin-hooks/src/index.ts
//
// 2026-09-11 — scaffolded alongside @sponsorcoin/spcoin-lib's upgrade,
// deliberately empty for now. Kept separate from spcoin-lib specifically
// so nothing that only needs a framework-agnostic utility is ever forced
// to carry a `react` peer dependency — this package is for portable React
// hooks only (declares `react` as a real peer dependency), spcoin-lib
// stays plain-JS/TS with none.
//
// No hooks live here yet, on purpose — per this project's own standing
// principle (design for the future, don't build it early — see
// extensionPlan.md), the first real candidate discussed so far is a
// Merit-side equivalent of useTokenContracts (lib/context/hooks/
// nestedHooks/useTokenContracts.ts) — same [value, setter] shape, backed
// by Merit's own local state instead of useContext(ExchangeContextState),
// which can't resolve outside the web app's own ExchangeProvider tree.
// Add it here once it's actually being built, not speculatively now.
export {};
