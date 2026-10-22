// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/DialogPortal.tsx
//
// 2026-10-22 (owner report: "the Delete Permanently button does not work"). Every full-screen confirmation dialog (DeleteWalletDialog, PasswordPromptDialog, the Reset Password card in
// WalletSessionDialogs) is `position: fixed; inset: 0` drawn deep inside MeritWallet's own tree. The web app's floating wallet positions itself with a CSS `transform` (SpCoinWalletPopup.tsx's
// drag positioning) — a plain CSS rule then reparents `position: fixed` to THAT transformed ancestor instead of the real viewport, so the dialog's "full screen" backdrop no longer actually
// covers the screen, and the Config tab's own scrollable content painted OVER it, catching every click meant for the dialog's buttons (confirmed with document.elementFromPoint at the button's
// own pixel: it resolved to the Config panel, never the dialog, even on a forced click). Escaping to the platform's portal target (platform/platform.ts's portalContainer — document.body for
// every real DOM host) fixes it for every wallet layout mode and every host; this file itself touches no device API directly (test/platformBoundary.test.mjs), only the platform interface.
'use client';

import { createPortal } from 'react-dom';
import { usePlatform } from './platform/platform';

export default function DialogPortal({ children }: { children: React.ReactNode }) {
  const container = usePlatform().portalContainer();
  // No portal target (a host with no such nesting problem, or none supplied): render in place, same as before this fix existed.
  if (!container) return <>{children}</>;
  return createPortal(children, container);
}
