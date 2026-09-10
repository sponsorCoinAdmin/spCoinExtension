// The spCoin web app URL this extension opens.
//
// No dedicated /wallet route exists in the main app yet (open question —
// see spcoin-nextjs-front-end/docs/design/extensionPlan.md, "2026-09-09"
// section) — this opens the app root for now. Swap to a dedicated route
// once that's decided; nothing else in this repo needs to change.
//
// Sourced from VITE_APP_URL (.env.production, tracked — see that file's
// own comment) rather than hardcoded per-mode strings, so the real prod
// URL lives in one place as data, not duplicated in code. Falls back to
// localhost:3000 for local dev, where no .env is committed (matches
// .gitignore's existing .env/.env.local exclusion) — dev works with zero
// local config unless you need to point it elsewhere.
export const SPCOIN_APP_URL: string =
  import.meta.env.VITE_APP_URL ?? 'http://localhost:3000';
