// File: spCoinCommon/src/appType.ts
//
// 2026-09-21, on direct request — which real deployment target a
// component is running in, as a real, shared, version-pinned flag
// instead of each consumer manually re-deciding platform-specific
// presentation for itself (the class of bug that just caused a real
// regression: the extension's WalletHeader.tsx close icon silently lost
// its "open the real web app" behavior when a caller forgot to pass the
// right override). Shared here (not duplicated per-app) so any portable
// component in @sponsorcoin/spcoin-panels — starting with WalletHeader.tsx
// — can make its own platform-appropriate default choice once, correctly,
// rather than depending on every caller remembering to override it.
//
// I_PHONE/ANDROID are real, named members from day one even though
// nothing reads them yet — declared now, per direct request, so a future
// mobile consumer has a real value to pass rather than this enum needing
// a breaking addition later.
export enum APP_TYPE {
  WEB_APP = 'WEB_APP',
  EXTENSION = 'EXTENSION',
  I_PHONE = 'I_PHONE',
  ANDROID = 'ANDROID',
}
