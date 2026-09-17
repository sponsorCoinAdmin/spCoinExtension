// The spCoin web app's production URL.
//
// No dedicated /wallet route exists in the main app yet (open question —
// see spcoin-nextjs-front-end/docs/design/extensionPlan.md, "2026-09-09"
// section) — this opens the app root for now. Swap to a dedicated route
// once that's decided; nothing else in this repo needs to change.
//
// Sourced from VITE_APP_URL (.env.production, tracked — see that file's
// own comment) rather than hardcoded, so the real prod URL lives in one
// place as data, not duplicated in code (openTargetStorage.ts's
// PROD_APP_URL reads this same constant rather than its own copy).
//
// 2026-09-14, on request ("why does the extension open button always open
// sponsorCoin.org and not localhost:3000") — the Open button no longer
// reads this directly (it always resolved to this value regardless of
// build, since `npm run build` always runs in Vite's production mode and
// always loads .env.production — see that file's own comment). It now
// goes through openTargetStorage.ts's persisted Local/Prod toggle instead,
// which uses this constant only for its "Prod" branch. Kept exported (not
// inlined into openTargetStorage.ts) so this stays the one place the real
// prod URL is read from VITE_APP_URL.
export const SPCOIN_PROD_APP_URL: string =
  import.meta.env.VITE_APP_URL ?? 'https://sponsorcoin.org';
