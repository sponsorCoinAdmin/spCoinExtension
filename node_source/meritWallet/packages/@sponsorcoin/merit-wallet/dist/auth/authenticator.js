// File: src/auth/authenticator.ts
//
// 2026-10-09 (docs/design/accountAuthDesign.txt row 3, docs/nodeSourceMigrationPlan.txt row 6) -- the AUTHENTICATOR interface: what the wallet asks of anything that can sign for an account. One interface, many
// implementations (a server keystore, the extension vault, an injected wallet such as MetaMask or the Merit extension, a hardware device); the wallet only ever calls this interface. The implementations are small
// adapters supplied by the host that has them and registered once at boot; the registry and the resolver (resolve.ts) live here in the package. This file is types and the one error class: no behaviour.
// Modelled on MetaMask's KeyringController / ApprovalController and on this package's existing hostContract (MeritWalletApi).
export class AuthenticatorError extends Error {
    constructor(code, message, authenticatorId) {
        super(message);
        this.name = 'AuthenticatorError';
        this.code = code;
        this.authenticatorId = authenticatorId;
    }
}
const PLATFORM_WORDS = { web: 'Web', extension: 'Extension', android: 'Android', iphone: 'I-Phone' };
/**
 * 2026-10-12 (docs/design/accountAuthDesign.txt section 18 section 3): the ONE name of a wallet, the same everywhere it is seen: the product and, in brackets, where it runs. "Merit Wallet (Web)" is the browser vault, "Merit Wallet (Extension)" the extension's vault (the
 * web page that connects to the extension sees the same wallet, so it has the same name), "Merit Wallet (Android)" / "(I-Phone)" the phone apps, "Merit Wallet (Web Dev Server)" the development keystore of the developer pages, "MetaMask", and a hardware
 * wallet by its own name. A vault's own platform (when it reports one) decides the bracket for the Merit wallets that run in more than one place. Group headers show it in capitals (the header style does that), sentences show it as written here.
 */
export function walletName(id, platform) {
    // FALLBACK ONLY: a table of the built-in ids, for an authenticator that supplies no displayName. A new wallet supplies its own name (authenticatorName); nothing is added here.
    if (id === 'serverKeystore')
        return 'Merit (Web App)';
    if (id === 'browserVault')
        return 'Merit Wallet (Web)';
    if (id === 'localVault' || id === 'injected:org.sponsorcoin.merit')
        return 'Merit Wallet (Extension)';
    if (id === 'deviceVault')
        return platform ? `Merit Wallet (${PLATFORM_WORDS[platform]})` : 'Merit Wallet (Phone)';
    if (id === 'injected:io.metamask')
        return 'MetaMask';
    if (id.startsWith('hardware:')) {
        const kind = id.slice('hardware:'.length);
        return `${kind.charAt(0).toUpperCase()}${kind.slice(1)} (Hardware)`;
    }
    if (id.startsWith('injected:'))
        return id.slice('injected:'.length);
    return id;
}
/** The name of this authenticator: the one it supplies, else the fallback table. The component asks this and never switches on the id. */
export const authenticatorName = (authenticator) => authenticator.displayName ?? walletName(authenticator.id, authenticator.vault?.platform);
/** The short name of this authenticator: the one it supplies, else the fallback table. */
export const authenticatorBadgeOf = (authenticator) => authenticator.badge ?? authenticatorBadge(authenticator.id);
/** Short names for the badge next to an account (Merit Wallet, Extension, MetaMask, Hardware). FALLBACK ONLY, see authenticatorBadgeOf. */
export function authenticatorBadge(id) {
    if (id === 'serverKeystore')
        return 'Merit Wallet';
    if (id === 'localVault')
        return 'Extension';
    if (id === 'browserVault')
        return 'Browser';
    if (id === 'deviceVault')
        return 'Device';
    if (id.startsWith('hardware:'))
        return 'Hardware';
    if (id === 'injected:io.metamask')
        return 'MetaMask';
    if (id === 'injected:org.sponsorcoin.merit')
        return 'Extension';
    if (id.startsWith('injected:'))
        return id.slice('injected:'.length);
    return id;
}
