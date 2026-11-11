import type { MeritPlatform } from '../platform/platform';
/** What replaces the key on the clipboard (owner's wording), so a paste after the time is up says why there is no key. */
export declare const KEY_COPY_TIMEOUT_TEXT = "Key Copy Time out";
/** How long a copied private key stays on the clipboard. */
export declare const CLIPBOARD_KEY_MS = 60000;
/** Take `copied` off the clipboard in CLIPBOARD_KEY_MS. A newer copy replaces the pending clear. */
export declare function scheduleClipboardClear(platform: MeritPlatform, copied: string, ms?: number): void;
