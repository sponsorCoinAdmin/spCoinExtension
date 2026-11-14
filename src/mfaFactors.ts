// File: src/mfaFactors.ts
//
// The extension's half of the sign-in options store: merit-wallet's createSecuritySetup does the work; this gives it the side panel's own localStorage (the extension origin, synchronous like the host contract needs),
// the device passkey store and the name shown in the authenticator app. (The store was a copy of the web app's file until 2026-11-14.)
import { createSecuritySetup } from '@sponsorcoin/merit-wallet';

export const meritSecuritySetup = createSecuritySetup({
  storage: () => window.localStorage,
  credentials: () => navigator.credentials,
  accountLabel: 'Merit Wallet (Extension)',
});
