# spCoinExtension

Merit Wallet's browser extension — a separate project from
`spcoin-nextjs-front-end`, by deliberate decision. See that repo's
`docs/design/extensionPlan.md` (the "2026-09-09" section, at the bottom)
for the full reasoning, the phased plan, and everything decided so far.

## What this is, right now

**Phase 1, tab-opener half only.** Clicking the toolbar icon opens/focuses
a tab on the spCoin web app (`src/config.ts`). No popup UI, no signing, no
`window.ethereum` injection yet — those come later, once this shell is
proven. The real wallet UI is not duplicated here; it stays exactly where
it already lives, in the existing Next.js app.

## Dependencies (not yet added)

This repo is meant to depend on published packages, not on
`spcoin-nextjs-front-end`'s source tree:

- `@sponsorcoin/spcoin-common` — already published, shared types
  (`Accounts`, `NetworkElement`, `APICoreSyncedMembers`, `SP_COIN_DISPLAY`).
- `@sponsorcoin/spcoin-wallet-core` — **not yet extracted.** Needs to be
  pulled out of `spcoin-nextjs-front-end`'s `components/wallet/lib/
  meritConnect/` + `getConnectedSigner.ts` + `lib/spCoinWallet/`'s account/
  keystore logic first, published the same way `spcoin-common` was. Do this
  before wiring any real signing into this repo — see
  `docs/design/spcoinPackagesDesign.md` in the main repo for the
  established publish pattern.

## Setup

```
npm install -D vite @crxjs/vite-plugin typescript @types/chrome
npm run dev     # or: npm run build, then load deploy/ unpacked in Chrome
```

Load unpacked: `chrome://extensions` → Developer mode → "Load unpacked" →
select `deploy/`, once. Every subsequent `npm run build` fully refreshes it
in place (Vite's own emptyOutDir clears it first) — just click the reload
icon on the extension card, no re-selecting the folder or re-downloading
anything needed.

## Known gaps / TODO

- No icons yet (`manifest.json` omits them — Chrome falls back to a
  generic icon).
- `src/config.ts` points at the app root; swap to a dedicated `/wallet`
  route once that's decided (open question, main repo's design doc).
- Distribution/deploy mechanism entirely undecided — Chrome Web Store,
  self-hosted git/npm release, or something else. Not EC2 by default; EC2
  only matters if this ends up needing a running server, which a packaged
  extension may not.
