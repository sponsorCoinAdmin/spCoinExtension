// File: spCoinCommon/src/index.ts
//
// Root barrel (the package's "." export) — re-exports all subpaths.
// Most consumers should prefer importing from the specific subpath
// (`@sponsorcoin/spcoin-common/context`, `/panels`, or `/styles`) for
// clarity about which slice of this package they depend on; this root
// export exists for convenience and for `main`/`types` fallback
// resolution.

export * from './context';
export * from './panels';
export * from './appType';
export * from './styles';
export * from './tradeExecutor';
