/** What replaces the key on the clipboard (owner's wording), so a paste after the time is up says why there is no key. */
export const KEY_COPY_TIMEOUT_TEXT = 'Key Copy Time out';
/** How long a copied private key stays on the clipboard. */
export const CLIPBOARD_KEY_MS = 60000;
let timer;
let stopRetry;
/** Take `copied` off the clipboard in CLIPBOARD_KEY_MS. A newer copy replaces the pending clear. */
export function scheduleClipboardClear(platform, copied, ms = CLIPBOARD_KEY_MS) {
    if (!platform.clearClipboard)
        return;
    if (timer)
        clearTimeout(timer);
    stopRetry?.();
    stopRetry = undefined;
    timer = setTimeout(() => {
        timer = undefined;
        const clear = platform.clearClipboard;
        if (!clear)
            return;
        void clear.call(platform, copied, KEY_COPY_TIMEOUT_TEXT).catch(() => {
            // refused (the page is hidden or not focused): once more when the page comes back
            stopRetry = platform.onVisibilityChange(() => {
                if (platform.isHidden())
                    return;
                stopRetry?.();
                stopRetry = undefined;
                void clear.call(platform, copied, KEY_COPY_TIMEOUT_TEXT).catch(() => undefined);
            });
        });
    }, ms);
}
