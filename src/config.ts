// The spCoin web app URL this extension opens.
//
// No dedicated /wallet route exists in the main app yet (open question —
// see spcoin-nextjs-front-end/docs/design/extensionPlan.md, "2026-09-09"
// section) — this opens the app root for now. Swap to a dedicated route
// once that's decided; nothing else in this repo needs to change.
export const SPCOIN_APP_URL: string = import.meta.env.DEV
  ? 'http://localhost:3000'
  : 'https://sponsorcoin.org';
