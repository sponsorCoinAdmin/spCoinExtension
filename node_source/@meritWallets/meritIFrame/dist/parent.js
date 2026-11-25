// File: src/parent.ts
//
// 2026-11-24: the PARENT side of the frame protocol: the page that embeds the wallet. It answers the wallet's hello with the injected data, learns when the wallet is ready, and answers the wallet's requests.
// It accepts a message only from the frame's own window AND from the wallet's origin. A request is validated (validateRequest) before a handler sees it, and an action with no handler is refused.
import { frameMessage, isFrameMessage, validateRequest, MAX_CALL_JSON } from './protocol';
/** Handlers for the two actions every web parent can do the same way: copy and open. close and resize depend on the page and are left to the host. */
export function defaultFrameHandlers() {
    return {
        copyText: ({ text }) => navigator.clipboard.writeText(text),
        openUrl: ({ url, sameTab }) => { if (sameTab)
            window.location.assign(url);
        else
            window.open(url, '_blank', 'noopener,noreferrer'); },
    };
}
export function connectWalletFrame({ frame, walletOrigin, init, handlers = {}, functions = {}, onMessage, onRequest }) {
    let resolveReady = () => undefined;
    const ready = new Promise((resolve) => { resolveReady = resolve; });
    const reply = (id, ok, error, result) => frame.contentWindow?.postMessage(frameMessage({ kind: 'response', id, ok, ...(error ? { error } : {}), ...(result !== undefined ? { result } : {}) }), walletOrigin);
    const listener = (event) => {
        if (event.source !== frame.contentWindow || event.origin !== walletOrigin)
            return;
        if (!isFrameMessage(event.data))
            return;
        const message = event.data;
        onMessage?.(message);
        if (message.kind === 'hello')
            frame.contentWindow?.postMessage(frameMessage({ kind: 'init', init: init() }), walletOrigin);
        if (message.kind === 'ready')
            resolveReady();
        if (message.kind === 'request') {
            const { id, action, payload } = message;
            const refusal = validateRequest(action, payload);
            const callPayload = action === 'call' ? payload : undefined;
            // a call is answered by a function the host registered by that name (never by inheritance: own names only); everything else by its handler
            const hostFunction = callPayload && Object.prototype.hasOwnProperty.call(functions, callPayload.name) ? functions[callPayload.name] : undefined;
            if (callPayload && !refusal && !hostFunction) {
                const error = `the parent does not offer ${callPayload.name}`;
                onRequest?.(`call ${callPayload.name}`, false, error);
                reply(id, false, error);
                return;
            }
            const handler = (callPayload ? undefined : handlers[action]);
            if (hostFunction && callPayload && !refusal) {
                Promise.resolve()
                    .then(() => hostFunction(...callPayload.args))
                    .then((result) => {
                    const answer = result === undefined ? undefined : result;
                    if (answer !== undefined && JSON.stringify(answer).length > MAX_CALL_JSON)
                        throw new Error(`the answer is limited to ${MAX_CALL_JSON} characters`);
                    onRequest?.(`call ${callPayload.name}`, true);
                    reply(id, true, undefined, answer);
                })
                    .catch((e) => { const error = e instanceof Error ? e.message : String(e); onRequest?.(`call ${callPayload.name}`, false, error); reply(id, false, error); });
                return;
            }
            if (refusal || !handler) {
                const error = refusal ?? `the parent does not offer ${action}`;
                onRequest?.(action, false, error);
                reply(id, false, error);
                return;
            }
            Promise.resolve()
                .then(() => handler(payload))
                .then(() => { onRequest?.(action, true); reply(id, true); })
                .catch((e) => { const error = e instanceof Error ? e.message : String(e); onRequest?.(action, false, error); reply(id, false, error); });
        }
    };
    window.addEventListener('message', listener);
    return { ready, dispose: () => window.removeEventListener('message', listener) };
}
