// File: src/auth/authenticator.ts
//
// 2026-10-09 (docs/authenticationDesign.txt row 3, docs/nodeSourceMigrationPlan.txt row 6) -- the AUTHENTICATOR interface: what the wallet asks of anything that can sign for an account. One interface, many
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
/** Short names for the badge next to an account (Merit Wallet, Extension, MetaMask, Hardware). */
export function authenticatorBadge(id) {
    if (id === 'serverKeystore')
        return 'Merit Wallet';
    if (id === 'localVault')
        return 'Extension';
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
