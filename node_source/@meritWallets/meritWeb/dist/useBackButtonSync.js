// File: src/useBackButtonSync.ts
//
// 2026-11-20 (owner: "can the back button of the phone do the same as the back button of the app in the Merit Wallet?"): ties the browser's Back (the phone's back button, the browser's back arrow) to the wallet's own Back.
// How: the wallet tells this host how many Back presses lead home (depth) and gives it the same goBack the header arrow runs. This host keeps exactly that many extra entries ("guards", same address) on top of the browser's history. A phone Back removes one, the browser tells us
// (popstate), and we run the wallet's goBack. At the home screen (depth 0) there are no guards, so Back leaves the site as it always did.
// Why one guard per level, added when the wallet goes DEEPER: Chrome marks a history entry a page adds without a fresh touch as "skippable" and the phone's back button steps over it (an anti-trap rule). The entries are therefore added the moment the person taps their way deeper (each
// is a real tap), and going back never needs a new one. (An earlier version added the guard back from inside the back press itself, which is not a touch: the first Back worked and the second left the page.) If the wallet's own arrow takes it home first, the extra guards are
// removed with history.go(-n) (its popstate ignored), so no stray entry is left behind. A wallet that reopens on a deep screen waits for the first touch before adding its guards.
// HOME GUARD (owner: "the last back should not pop the app"): one more entry always sits under the levels, so a Back at the home screen is absorbed and the wallet stays. A page cannot be made impossible to leave (browsers keep the final exit), so the absorbed entry is put back
// on the person's NEXT touch (added on a touch, so the browser keeps it); two Backs in a row with no touch between them leave the site.
import { useCallback, useEffect, useRef } from 'react';
import { meritDebug } from '@sponsorcoin/merit-wallet';
const GUARD = { meritWalletBack: true };
/** the guard that always stays under the levels: it absorbs the Back pressed at the home screen */
const HOME_GUARDS = 1;
/** Has the person touched this page yet? A browser without the API counts as touched. */
const touchedPage = () => {
    const activation = navigator.userActivation;
    return activation ? activation.hasBeenActive : true;
};
const log = (message) => meritDebug.log('back', `${message} (history ${window.history.length}, touched ${touchedPage()})`);
export function useBackButtonSync() {
    const nav = useRef({ canGoBack: false, depth: 0, goBack: () => undefined });
    const armed = useRef(0); // guard entries on top of the history
    const ignorePops = useRef(0); // popstates caused by our own history.go()
    const waiting = useRef(false); // listening for the first touch
    const syncRef = useRef(() => undefined);
    /** run sync() during the person's next touch (a guard added then is one the browser keeps) */
    const afterNextTouch = useCallback((why) => {
        if (waiting.current)
            return;
        waiting.current = true;
        log(why);
        const events = ['click', 'touchend', 'pointerup', 'keydown'];
        const done = () => {
            events.forEach((e) => window.removeEventListener(e, done, true));
            waiting.current = false;
            syncRef.current();
        };
        events.forEach((e) => window.addEventListener(e, done, true));
    }, []);
    const sync = useCallback(() => {
        if (typeof window === 'undefined')
            return;
        const target = (nav.current.canGoBack ? Math.max(1, nav.current.depth) : 0) + HOME_GUARDS;
        if (target > armed.current) {
            if (!touchedPage()) {
                // the wallet reopened on a deep screen and nothing has touched the page yet: wait for the first touch, then add the guards (during that touch, so the browser keeps them)
                afterNextTouch('guards waiting for the first touch');
                return;
            }
            const add = target - armed.current;
            for (let i = 0; i < add; i++)
                window.history.pushState(GUARD, '');
            armed.current = target;
            log(`${add} guard${add === 1 ? '' : 's'} added, now ${target}`);
        }
        else if (target < armed.current) {
            const remove = armed.current - target;
            armed.current = target;
            ignorePops.current += 1; // one traversal, one popstate
            log(`${remove} guard${remove === 1 ? '' : 's'} removed, now ${target}`);
            window.history.go(-remove);
        }
    }, []);
    syncRef.current = sync;
    useEffect(() => {
        // a guard left in the history by an earlier page load (a reload keeps it) is just an entry with our mark: take the mark off so it is not mistaken for ours
        try {
            if (window.history.state && window.history.state.meritWalletBack)
                window.history.replaceState(null, '');
        }
        catch {
            /* history unavailable */
        }
        const onPop = () => {
            if (ignorePops.current > 0) {
                ignorePops.current -= 1;
                log('popstate ignored (our own)');
                return;
            }
            if (armed.current === 0) {
                log('popstate but no guard is on top (the browser left or skipped it)');
                return;
            }
            armed.current -= 1; // the browser already removed one guard
            if (nav.current.canGoBack) {
                log("phone back: running the wallet's own back");
                nav.current.goBack(); // the wallet's own Back; its navigation change then settles the guards to its new depth
            }
            else {
                // the wallet is home: the home guard took this Back, so the wallet stays; the guard comes back on the next touch
                afterNextTouch('phone back at home absorbed; the home guard returns on the next touch');
            }
        };
        window.addEventListener('popstate', onPop);
        return () => window.removeEventListener('popstate', onPop);
    }, [afterNextTouch]);
    return useCallback((state) => {
        nav.current = state;
        sync();
    }, [sync]);
}
