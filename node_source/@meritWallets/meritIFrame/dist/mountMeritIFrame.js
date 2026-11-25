// File: src/mountMeritIFrame.ts
//
// 2026-11-25 (owner: mount the wallet as either meritWeb or meritIFrame, using only one): the iframe mount. A host passes the SAME HostInjectables it would pass to meritWeb's mountMeritWeb; this puts the wallet page in a frame, injects the type and settings as data, and answers the wallet's requests
// with the host's functions (copyText, openUrl, close, and any other name through `call`). The wallet address may be relative (a wallet page bundled with the host) or absolute (a hosted one).
import { createWalletFrame } from './openStandaloneWallet';
import { connectWalletFrame, defaultFrameHandlers } from './parent';
import { customFunctionNames } from './injectables';
import { embedUrl } from './protocol';
export function mountMeritIFrame({ element, walletUrl, injectables = {}, width = '100%', height = '100%', onMessage, onRequest }) {
    const resolved = new URL(walletUrl, window.location.href);
    const functions = injectables.functions ?? {};
    const defaults = defaultFrameHandlers();
    const handlers = {
        copyText: functions.copyText ? async ({ text }) => { await functions.copyText(text); } : defaults.copyText,
        openUrl: functions.openUrl ? async ({ url, sameTab }) => { await functions.openUrl(url, { sameTab: !!sameTab }); } : defaults.openUrl,
        close: async () => { if (functions.close)
            await functions.close(); },
    };
    const custom = {};
    for (const name of customFunctionNames(functions))
        custom[name] = functions[name];
    const handle = createWalletFrame({ url: embedUrl(resolved.toString()), parent: element, width, height });
    const connection = connectWalletFrame({
        frame: handle.frame,
        walletOrigin: resolved.origin,
        init: () => ({ walletType: ((injectables.walletType ?? 'WEB').toUpperCase().replace(' ', '_')), settings: injectables.settings ?? {}, functionNames: Object.keys(custom) }),
        handlers,
        functions: custom,
        onMessage,
        onRequest,
    });
    return {
        frame: handle.frame,
        ready: connection.ready,
        dispose: () => { connection.dispose(); handle.dispose(); },
    };
}
