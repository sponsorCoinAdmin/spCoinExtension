// File: src/useMeritWebApp.ts
//
// 2026-11-07 (owner request): useMeritWebApp() -> { meritWebAppConnected }, whether the Merit web app is connected to this extension: it answers (a page is open and logged on) and the person has not disconnected it (the merit-connect link, asked, never remembered).
// Extension only: the web app has no Merit web app to connect to; it has useMeritExtension. The same link webAppAuthenticator.ts reads; the React side is useMeritLink in the wallet package.
import { useMeritLink } from '@sponsorcoin/merit-wallet';
import { extensionPeers } from './extensionPeers';

const peer = () => extensionPeers.serverKeystore;
const source = { link: () => ({ connected: peer().get().connected }), subscribeLink: (listener: () => void) => peer().subscribe(listener) };

export function useMeritWebApp(): { meritWebAppConnected: boolean } {
  return { meritWebAppConnected: useMeritLink(source) };
}
