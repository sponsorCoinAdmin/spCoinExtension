// File: src/auth/hardwareAuthenticator.ts
//
// 2026-10-12 (docs/authenticationDesign.txt row 16, Q3): the HARDWARE authenticator ('hardware:<kind>', e.g. 'hardware:ledger'). The device keeps the keys and shows every request on its own screen, so this adapter keeps
// none: it speaks to a HardwareTransport (WebHID for a Ledger first, a QR exchange later) and translates what the device says into the one error set. Like MetaMask it is signing-only: it carries no vault capability, lists
// the accounts the device exposes after a connect, and signs a message or a transaction behind the device's approval. EVM only; typed data is not offered in this version (capability honesty, 6A.7). The browser
// needs a user gesture and a permission grant to open a device, so connect() is the only call that opens one; everything else needs it already connected. No transport library is bundled here: the host supplies one.
import { AuthenticatorError } from './authenticator';
/** What a transport reports when the device refuses or cannot act. */
export class HardwareError extends Error {
    constructor(code, message) {
        super(message);
        this.name = 'HardwareError';
        this.code = code;
    }
}
export function createHardwareAuthenticator(transport, options) {
    const id = `hardware:${transport.kind}`;
    const translate = (error) => {
        if (error instanceof AuthenticatorError)
            throw error;
        if (error instanceof HardwareError) {
            if (error.code === 'rejected')
                throw new AuthenticatorError('user_rejected', error.message || 'You declined it on the device.', id);
            if (error.code === 'locked' || error.code === 'app_closed')
                throw new AuthenticatorError('locked', error.message || 'Unlock the device and open its Ethereum app.', id);
            if (error.code === 'unsupported')
                throw new AuthenticatorError('unsupported', error.message || 'The device cannot do that.', id);
            throw new AuthenticatorError('unreachable', error.message || 'The device is not connected.', id);
        }
        throw new AuthenticatorError('unreachable', error instanceof Error ? error.message : 'The device did not answer.', id);
    };
    const toAccounts = (rows) => rows.map((a) => ({ address: a.address, name: a.name, source: id }));
    const open = (address) => {
        if (!transport.isConnected())
            throw new AuthenticatorError('unreachable', 'The device is not connected. Connect it first.', id);
        const key = String(address ?? '').toLowerCase();
        if (!transport.accounts().some((a) => a.address.toLowerCase() === key))
            throw new AuthenticatorError('unauthorized', `${address} is not an account of this device.`, id);
    };
    return {
        id,
        label: transport.kind.charAt(0).toUpperCase() + transport.kind.slice(1),
        capabilities: { signMessage: true, signTypedData: false, sendTransaction: true, listAccounts: true, createAccount: false, importKey: false, lock: false },
        async status() {
            return { available: transport.isSupported(), unlocked: transport.isConnected() };
        },
        async accounts() {
            return transport.isConnected() ? toAccounts(transport.accounts()) : [];
        },
        async connect() {
            if (!transport.isSupported())
                throw new AuthenticatorError('unreachable', 'This browser cannot talk to the device.', id);
            try {
                return toAccounts(await transport.connect());
            }
            catch (error) {
                return translate(error);
            }
        },
        async disconnect() {
            await transport.disconnect();
        },
        async signMessage(address, message) {
            open(address);
            try {
                return await transport.signMessage(address, message);
            }
            catch (error) {
                return translate(error);
            }
        },
        async sendTransaction(tx) {
            open(tx.from);
            let raw;
            try {
                raw = await transport.signTransaction(tx);
            }
            catch (error) {
                return translate(error);
            }
            // a failure to broadcast is the network's, not the device's: it keeps its own error
            return { hash: await options.broadcast(raw, tx.chainId) };
        },
        onChange(listener) {
            return transport.onChange(() => listener('availability'));
        },
    };
}
