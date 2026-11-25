// File: src/child.ts
//
// 2026-11-24: the WALLET side of the frame protocol: what the embedded wallet app calls before it draws. It says hello to its parent and waits for the injected data; afterwards the bridge lets the wallet ASK its parent for things (copy, open an address, close, resize).
// It talks only to a parent whose origin is on the allowed list, and accepts an answer only from that parent window.
import { frameMessage, isFrameMessage } from './protocol';
import { buildInjectables } from './injectables';
/** The origin of the page that embeds this one, when the browser tells (Chrome: ancestorOrigins; otherwise the referrer). */
function knownParentOrigin() {
    const ancestors = window.location.ancestorOrigins;
    if (ancestors && ancestors.length > 0)
        return ancestors[0];
    try {
        return document.referrer ? new URL(document.referrer).origin : undefined;
    }
    catch {
        return undefined;
    }
}
function makeBridge(parentOrigin) {
    let nextId = 1;
    const waiting = new Map();
    const onMessage = (event) => {
        if (event.source !== window.parent || event.origin !== parentOrigin)
            return;
        if (!isFrameMessage(event.data) || event.data.kind !== 'response')
            return;
        const entry = waiting.get(event.data.id);
        if (!entry)
            return;
        waiting.delete(event.data.id);
        clearTimeout(entry.timer);
        if (event.data.ok)
            entry.resolve(event.data.result);
        else
            entry.reject(new Error(event.data.error ?? 'the parent refused'));
    };
    window.addEventListener('message', onMessage);
    const send = (action, payload, timeoutMs) => new Promise((resolve, reject) => {
        const id = nextId++;
        const timer = setTimeout(() => { waiting.delete(id); reject(new Error(`the parent did not answer ${action}`)); }, timeoutMs);
        waiting.set(id, { resolve, reject, timer });
        window.parent.postMessage(frameMessage({ kind: 'request', id, action, payload }), parentOrigin);
    });
    return {
        request(action, payload, timeoutMs = 5000) {
            return send(action, payload, timeoutMs).then(() => undefined);
        },
        call(name, args, timeoutMs = 10000) {
            return send('call', { name, args }, timeoutMs);
        },
        dispose() {
            window.removeEventListener('message', onMessage);
            for (const entry of waiting.values()) {
                clearTimeout(entry.timer);
                entry.reject(new Error('the bridge was closed'));
            }
            waiting.clear();
        },
    };
}
/**
 * Not framed, or the parent is not allowed, or it does not answer in time: resolves undefined and the wallet runs on its own, exactly as it always did.
 * Framed by an allowed parent: resolves the injected data and a bridge, after telling the parent it is ready.
 */
export function awaitParentInit({ allowedParentOrigins, timeoutMs = 3000 }) {
    if (typeof window === 'undefined' || window.parent === window)
        return Promise.resolve(undefined);
    const known = knownParentOrigin();
    const candidates = known ? allowedParentOrigins.filter((o) => o === known) : [...allowedParentOrigins];
    if (candidates.length === 0)
        return Promise.resolve(undefined);
    return new Promise((resolve) => {
        const finish = (value) => {
            clearTimeout(timer);
            window.removeEventListener('message', onMessage);
            resolve(value);
        };
        const timer = setTimeout(() => finish(undefined), timeoutMs);
        const onMessage = (event) => {
            if (event.source !== window.parent || !candidates.includes(event.origin))
                return;
            if (!isFrameMessage(event.data) || event.data.kind !== 'init')
                return;
            const parentOrigin = event.origin;
            window.parent.postMessage(frameMessage({ kind: 'ready' }), parentOrigin);
            finish({ init: event.data.init, bridge: makeBridge(parentOrigin) });
        };
        window.addEventListener('message', onMessage);
        for (const origin of candidates)
            window.parent.postMessage(frameMessage({ kind: 'hello' }), origin);
    });
}
/**
 * The two device actions a framed wallet sends to its parent instead of doing itself, shaped like the wallet's platform interface (copyText, openUrl). The wallet app spreads these over its own platform:
 * { ...domPlatform, ...framePlatformOverrides(bridge) }. The frame package does not import the wallet, so the shapes are matched here structurally.
 */
export function framePlatformOverrides(bridge) {
    return {
        copyText: (text) => bridge.request('copyText', { text }),
        openUrl: (url, options) => { void bridge.request('openUrl', { url, sameTab: options?.sameTab }).catch(() => undefined); },
    };
}
/**
 * The injectables a framed wallet receives: the type and settings the parent injected, a stub for each host function the parent registered (each asks the parent and resolves its answer), and copyText, openUrl and close as the bridge's requests.
 * The wallet gets the same HostInjectables shape it would get from a host that mounts it in its own page.
 */
export function injectablesFromParent(parent) {
    const { bridge } = parent;
    return buildInjectables(parent.init, (name, args) => bridge.call(name, args), {
        copyText: (text) => copyHere(String(text), bridge),
        openUrl: (url, options) => { void bridge.request('openUrl', { url: String(url), sameTab: !!options?.sameTab }).catch(() => undefined); },
        close: () => { void bridge.request('close', {}).catch(() => undefined); },
    });
}
/**
 * Copy for a framed wallet. The wallet is the page the person clicked in, so it copies HERE first: that works with the click and with the frame's focus. The PARENT's clipboard is refused when the parent document is not the focused one (the frame has the focus), which is why asking the parent comes last.
 * Order: the page's own clipboard, then the old copy command on a hidden text box, then the parent.
 */
async function copyHere(text, bridge) {
    try {
        await navigator.clipboard.writeText(text);
        return;
    }
    catch {
        /* not allowed here: try the next way */
    }
    try {
        const box = document.createElement('textarea');
        box.value = text;
        box.setAttribute('readonly', '');
        box.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none;';
        document.body.appendChild(box);
        box.select();
        const done = document.execCommand('copy');
        box.remove();
        if (done)
            return;
    }
    catch {
        /* not allowed here either: ask the parent */
    }
    await bridge.request('copyText', { text });
}
