// File: src/auth/injectedAuthenticator.ts
//
// 2026-10-10 (docs/connectionDesign.txt items 4, 8 and 9; docs/authenticationDesign.txt rows 5, 7 and 12) -- ONE authenticator for every wallet that speaks EIP-1193: MetaMask, the Merit extension, any EIP-6963 wallet. It is the generic "injected" authenticator of
// authenticationDesign section 4: it holds no key, it asks the wallet (its own popup) and translates the wallet's answers and errors into the wallet's one error set. The host only says how to FIND the provider (window.ethereum, an EIP-6963 announcement,
// the extension's own provider) and under which id to register it ('injected:io.metamask', 'injected:org.sponsorcoin.merit').
// connect() is eth_requestAccounts (the wallet's own account picker, so MetaMask shows which accounts to share), accounts() is eth_accounts (no popup), disconnect() revokes the site's permission when the wallet supports that, signMessage() is personal_sign with the
// message as UTF-8 hex, sendTransaction() is eth_sendTransaction after making sure the wallet is on the right chain.
import { AuthenticatorError, } from './authenticator';
const utf8Hex = (text) => `0x${Array.from(new TextEncoder().encode(text), (b) => b.toString(16).padStart(2, '0')).join('')}`;
/** EIP-1193 / JSON-RPC error codes -> the wallet's error set. Anything not recognised is rethrown as it came. */
export function translateProviderError(error, id, label) {
    if (error instanceof AuthenticatorError)
        return error;
    const code = error?.code;
    const message = error?.message;
    const text = typeof message === 'string' && message ? message : '';
    switch (code) {
        case 4001:
            return new AuthenticatorError('user_rejected', text || `${label}: the request was rejected.`, id);
        case 4100:
            return new AuthenticatorError('unauthorized', text || `${label}: this site is not authorized for that account.`, id);
        case 4900:
        case 4901:
            return new AuthenticatorError('unreachable', text || `${label} is disconnected.`, id);
        case 4902:
            return new AuthenticatorError('wrong_chain', text || `${label} does not know that network.`, id);
        case -32002:
            return new AuthenticatorError('locked', text || `${label} already has a request open: finish it in the wallet.`, id);
        default:
            return error;
    }
}
export function createInjectedAuthenticator({ id, label, icon, getProvider }) {
    const need = async () => {
        const provider = await getProvider();
        if (!provider)
            throw new AuthenticatorError('unreachable', `${label} is not installed in this browser.`, id);
        return provider;
    };
    const call = async (method, params) => {
        const provider = await need();
        try {
            return (await provider.request(params === undefined ? { method } : { method, params }));
        }
        catch (error) {
            throw translateProviderError(error, id, label);
        }
    };
    const toAccounts = (addresses) => (Array.isArray(addresses) ? addresses : []).filter((a) => typeof a === 'string').map((address) => ({ address, source: id }));
    return {
        id,
        label,
        icon,
        capabilities: { signMessage: true, signTypedData: true, sendTransaction: true, listAccounts: true, createAccount: false, importKey: false, lock: false },
        async status() {
            let provider;
            try {
                provider = await getProvider();
            }
            catch {
                provider = undefined;
            }
            if (!provider)
                return { available: false, unlocked: false };
            try {
                const accounts = (await provider.request({ method: 'eth_accounts' }));
                return { available: true, unlocked: Array.isArray(accounts) && accounts.length > 0 };
            }
            catch {
                return { available: true, unlocked: false };
            }
        },
        async accounts() {
            return toAccounts(await call('eth_accounts'));
        },
        async connect() {
            return toAccounts(await call('eth_requestAccounts'));
        },
        async disconnect() {
            try {
                await call('wallet_revokePermissions', [{ eth_accounts: {} }]);
            }
            catch (error) {
                const code = error?.code;
                // A wallet without wallet_revokePermissions (older MetaMask, other wallets) has nothing to revoke: that is not a failure.
                if (code === -32601 || code === 4200)
                    return;
                throw error;
            }
        },
        async signMessage(address, message) {
            return call('personal_sign', [utf8Hex(message), address]);
        },
        async signTypedData(address, typedData) {
            return call('eth_signTypedData_v4', [address, typeof typedData === 'string' ? typedData : JSON.stringify(typedData)]);
        },
        async sendTransaction(tx) {
            const wanted = `0x${tx.chainId.toString(16)}`;
            const current = await call('eth_chainId');
            if (String(current).toLowerCase() !== wanted)
                await call('wallet_switchEthereumChain', [{ chainId: wanted }]);
            const hash = await call('eth_sendTransaction', [
                { from: tx.from, ...(tx.to ? { to: tx.to } : {}), ...(tx.value !== undefined ? { value: `0x${tx.value.toString(16)}` } : {}), ...(tx.data ? { data: tx.data } : {}) },
            ]);
            return { hash };
        },
        onChange(listener) {
            let provider;
            let cancelled = false;
            const accountsChanged = () => listener('accountsChanged');
            const chainChanged = () => listener('chainChanged');
            void Promise.resolve(getProvider()).then((p) => {
                if (cancelled || !p)
                    return;
                provider = p;
                p.on?.('accountsChanged', accountsChanged);
                p.on?.('chainChanged', chainChanged);
            });
            return () => {
                cancelled = true;
                provider?.removeListener?.('accountsChanged', accountsChanged);
                provider?.removeListener?.('chainChanged', chainChanged);
            };
        },
    };
}
