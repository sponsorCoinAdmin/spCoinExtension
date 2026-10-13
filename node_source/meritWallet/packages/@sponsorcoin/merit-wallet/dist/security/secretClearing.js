// File: src/security/secretClearing.ts
//
// 2026-10-12 (docs/design/accountAuthDesign.txt 14.7, item V9, memory clearing): a secret that is shown on a screen (the Secret Recovery Phrase after a wallet is created, a revealed phrase or private key in Security) must not stay in the
// page for long. watchSecret takes the function that clears it and calls it when the page is hidden (the tab is switched away or the window is minimised) or when the screen has been open for `maxMs`, whichever comes first, and gives
// back the function that stops watching. Pure: the document and the timer are passed in, so a test can drive both. SecretClearing (React) is the one hook the screens use.
import { useEffect } from 'react';
/** How long a revealed secret may stay on a screen at most. */
export const SECRET_SHOWN_MAX_MS = 60000;
/** How long the Secret Recovery Phrase of a NEW wallet may stay on its screen at most (the person is writing it down). */
export const NEW_PHRASE_SHOWN_MAX_MS = 5 * 60000;
export function watchSecret(clear, maxMs, env) {
    let done = false;
    const fire = () => {
        if (done)
            return;
        done = true;
        stop();
        clear();
    };
    const onVisibility = () => {
        if (env.page.hidden)
            fire();
    };
    env.page.addEventListener('visibilitychange', onVisibility);
    const timer = env.setTimer(fire, maxMs);
    function stop() {
        env.page.removeEventListener('visibilitychange', onVisibility);
        env.clearTimer(timer);
    }
    return () => {
        done = true;
        stop();
    };
}
/** While `shown` is true, clear the secret when the page is hidden or after `maxMs`. */
export function useSecretClearing(shown, clear, maxMs) {
    useEffect(() => {
        if (!shown || typeof document === 'undefined')
            return undefined;
        return watchSecret(clear, maxMs, {
            page: document,
            setTimer: (fn, ms) => setTimeout(fn, ms),
            clearTimer: (handle) => clearTimeout(handle),
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shown, maxMs]);
}
