// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/provider/injectedWallet.ts
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt, E6 / table row 18) -- the PROVIDER implementation of the wallet API, for a web page (the web app)
// that does not hold keys: it finds the Merit Wallet extension through EIP-6963 and talks to it with EIP-1193 requests. This is MetaMask's own
// relationship to a dapp. If the extension is not installed, discovery resolves to null and the host shows "Install the Merit Wallet extension"
// instead of a connect button. No React and no chrome.* here: it needs only a window with the standard events.
export const MERIT_RDNS = 'org.sponsorcoin.merit';
/** Ask every wallet on the page to announce itself and collect the answers for `timeoutMs`. */
export function discoverWallets(win, timeoutMs = 300) {
    return new Promise((resolve) => {
        const found = new Map();
        const onAnnounce = (event) => {
            const detail = event.detail;
            if (detail?.info?.uuid && detail.provider)
                found.set(detail.info.uuid, detail);
        };
        win.addEventListener('eip6963:announceProvider', onAnnounce);
        win.dispatchEvent(new Event('eip6963:requestProvider'));
        setTimeout(() => {
            win.removeEventListener('eip6963:announceProvider', onAnnounce);
            resolve(Array.from(found.values()));
        }, timeoutMs);
    });
}
/** The Merit Wallet extension's provider, or null when it is not installed. */
export async function findMeritWallet(win, timeoutMs = 300) {
    return (await discoverWallets(win, timeoutMs)).find((d) => d.info.rdns === MERIT_RDNS) ?? null;
}
const utf8Hex = (text) => `0x${Array.from(new TextEncoder().encode(text), (b) => b.toString(16).padStart(2, '0')).join('')}`;
export function createInjectedWalletApi(provider) {
    const subscribe = (event, handler) => {
        provider.on?.(event, handler);
        return () => {
            provider.removeListener?.(event, handler);
        };
    };
    return {
        async connect() {
            return (await provider.request({ method: 'eth_requestAccounts' }));
        },
        async accounts() {
            return (await provider.request({ method: 'eth_accounts' }));
        },
        async chainId() {
            return Number(BigInt((await provider.request({ method: 'eth_chainId' }))));
        },
        async switchChain(chainId) {
            await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: `0x${chainId.toString(16)}` }] });
        },
        async signMessage(address, message) {
            return (await provider.request({ method: 'personal_sign', params: [utf8Hex(message), address] }));
        },
        async sendTransaction(tx) {
            return (await provider.request({
                method: 'eth_sendTransaction',
                params: [{ from: tx.from, ...(tx.to ? { to: tx.to } : {}), ...(tx.value !== undefined ? { value: `0x${tx.value.toString(16)}` } : {}), ...(tx.data ? { data: tx.data } : {}) }],
            }));
        },
        onAccountsChanged: (listener) => subscribe('accountsChanged', (a) => listener(a)),
        onChainChanged: (listener) => subscribe('chainChanged', (c) => listener(Number(BigInt(c)))),
    };
}
