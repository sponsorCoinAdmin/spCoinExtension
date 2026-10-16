// File: src/platform/platform.ts
//
// 2026-10-15 (docs/design/spcoinPackagesDesign.txt sections 8.5.7 item 1 and 8.5.8) -- the PLATFORM interface of the host contract: what the wallet needs from the device it runs on, as one interface a deployment implements. It is the "Platform" host interface of
// the package design (open a URL, copy to the clipboard, ...): the web app and the extension use the DOM implementation (./domPlatform.ts, the default); an Android or phone host injects its own through the `platform` prop of MeritWallet.
// The component calls these methods and never reaches for window, document, navigator or localStorage itself (checked by test/platformBoundary.test.mjs).
//
// This file holds no global: the interface, the React context that carries the host's choice, and the hook the components read it with.
import { createContext, useContext } from 'react';
import { domPlatform } from './domPlatform';
/** What a component reads: the host's platform, or the DOM one when the host gave none (the web app and the extension give none). */
export const MeritPlatformContext = createContext(domPlatform);
export const usePlatform = () => useContext(MeritPlatformContext);
