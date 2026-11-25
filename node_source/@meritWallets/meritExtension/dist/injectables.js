/** The functions the wallet's platform uses, done the extension's way: copy through the clipboard, open an address in a new tab, close the extension page. */
export function extensionInjectables(apis) {
    return {
        functions: {
            copyText: async (text) => {
                if (!apis.clipboard)
                    throw new Error('no clipboard here');
                await apis.clipboard.writeText(String(text));
            },
            openUrl: (url) => {
                if (apis.tabs)
                    apis.tabs.create({ url: String(url) });
                else
                    apis.openWindow?.(String(url));
            },
            close: () => {
                apis.closePage?.();
            },
        },
    };
}
