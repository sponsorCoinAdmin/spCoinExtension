export function createSecretCache(options = {}) {
    const { idleMs = 0, now = Date.now, setTimer = (fn, ms) => setTimeout(fn, ms), clearTimer = (h) => clearTimeout(h) } = options;
    let held;
    let timer;
    let lastUsed = 0;
    const listeners = new Set();
    const stopTimer = () => {
        if (timer !== undefined)
            clearTimer(timer);
        timer = undefined;
    };
    const wipe = () => {
        const had = held !== undefined;
        held = undefined;
        stopTimer();
        if (had)
            listeners.forEach((listener) => listener());
    };
    const arm = () => {
        lastUsed = now();
        stopTimer();
        if (idleMs > 0)
            timer = setTimer(wipe, idleMs);
    };
    return {
        put(secret) {
            held = { value: secret };
            arm();
        },
        get() {
            if (!held)
                return undefined;
            // a timer that was throttled (a background tab) must not keep a secret past its time
            if (idleMs > 0 && now() - lastUsed >= idleMs) {
                wipe();
                return undefined;
            }
            arm();
            return held.value;
        },
        has: () => held !== undefined && !(idleMs > 0 && now() - lastUsed >= idleMs),
        clear: wipe,
        onCleared(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
    };
}
