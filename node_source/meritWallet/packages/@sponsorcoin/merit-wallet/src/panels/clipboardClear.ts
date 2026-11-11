// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/panels/clipboardClear.ts
//
// 2026-11-11 (owner): a private key copied to the clipboard is taken off it again after CLIPBOARD_KEY_MS (60 seconds). It is a module-level timer, not the panel's: closing the panel, or the confirmation finishing, must not leave the key on the clipboard.
// Best effort, and it says so: a browser may refuse a clipboard write while the page is hidden or not focused, so a clear that fails is tried again once, when the page is visible again. The clearing itself is the platform's (platform.clearClipboard).
import type { MeritPlatform } from '../platform/platform';

/** What replaces the key on the clipboard (owner's wording), so a paste after the time is up says why there is no key. */
export const KEY_COPY_TIMEOUT_TEXT = 'Key Copy Time out';

/** How long a copied private key stays on the clipboard. */
export const CLIPBOARD_KEY_MS = 60_000;

let timer: ReturnType<typeof setTimeout> | undefined;
let stopRetry: (() => void) | undefined;

/** Take `copied` off the clipboard in CLIPBOARD_KEY_MS. A newer copy replaces the pending clear. */
export function scheduleClipboardClear(platform: MeritPlatform, copied: string, ms: number = CLIPBOARD_KEY_MS): void {
  if (!platform.clearClipboard) return;
  if (timer) clearTimeout(timer);
  stopRetry?.();
  stopRetry = undefined;
  timer = setTimeout(() => {
    timer = undefined;
    const clear = platform.clearClipboard;
    if (!clear) return;
    void clear.call(platform, copied, KEY_COPY_TIMEOUT_TEXT).catch(() => {
      // refused (the page is hidden or not focused): once more when the page comes back
      stopRetry = platform.onVisibilityChange(() => {
        if (platform.isHidden()) return;
        stopRetry?.();
        stopRetry = undefined;
        void clear.call(platform, copied, KEY_COPY_TIMEOUT_TEXT).catch(() => undefined);
      });
    });
  }, ms);
}
