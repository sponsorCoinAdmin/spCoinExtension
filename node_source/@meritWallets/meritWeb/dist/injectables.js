// File: src/injectables.ts
//
// 2026-11-25 (owner: one set of injectables, two ways to mount; docs/design/meritWalletDesign.txt section 11): the options a host injects into the wallet, and how they become what the wallet component takes. The SAME object works whether the host mounts meritWeb in its page or
// meritIFrame frames it (in a frame, meritIFrame hands the wallet this shape, with each host function standing in as a stub). This package knows nothing about frames: the shape is matched structurally, with no import. Pure: no imports.
/** Run a host function so that neither a throw nor a rejection can reach the wallet: the answer is always a promise. */
const run = (fn, ...args) => {
    try {
        return Promise.resolve(fn(...args));
    }
    catch (error) {
        return Promise.reject(error);
    }
};
export function mountPiecesFromInjectables(injectables) {
    const functions = injectables?.functions ?? {};
    const has = (name) => Object.prototype.hasOwnProperty.call(functions, name) && typeof functions[name] === 'function';
    const pieces = {};
    if (injectables?.walletType)
        pieces.walletType = injectables.walletType;
    const platform = {};
    if (has('copyText'))
        platform.copyText = async (text) => { await run(functions.copyText, text); };
    if (has('openUrl'))
        platform.openUrl = (url, options) => { void run(functions.openUrl, url, { sameTab: !!options?.sameTab }).catch(() => undefined); };
    if (platform.copyText || platform.openUrl)
        pieces.platform = platform;
    if (has('close'))
        pieces.onClose = () => { void run(functions.close).catch(() => undefined); };
    return pieces;
}
