// File: src/auth/hardwareShared.ts
//
// 2026-10-13 (docs/design/accountAuthDesign.txt section 17 item 12, owner request: Ledger AND Trezor, shared methods): everything a hardware-wallet transport needs that does not depend on WHICH device it is. A Ledger (ledgerTransport.ts) and a Trezor (trezorTransport.ts) each speak their own
// protocol; they share these: the account paths, one request at a time, the device state (accounts, connected, change announcements), the nonce / gas / fees a device does not know, the personal-message signature and the signed raw transaction put together from the device's r, s and v.
// No key and no device library here: plain functions over the transport's own results. Tested through both transports (test/ledgerTransport.test.mjs, test/trezorTransport.test.mjs).
import { serializeTransaction } from 'viem';
/** The Ledger Live account path (Ledger's own app and MetaMask default): m/44'/60'/<index>'/0/0 (no leading "m/"). */
export const ledgerLivePath = (index) => `44'/60'/${index}'/0/0`;
/** The standard BIP-44 Ethereum path (Trezor Suite's default): m/44'/60'/0'/0/<index> (no leading "m/"). */
export const ethereumBip44Path = (index) => `44'/60'/0'/0/${index}`;
export const strip0x = (hex) => (hex.startsWith('0x') ? hex.slice(2) : hex);
export const utf8Hex = (text) => Array.from(new TextEncoder().encode(text), (b) => b.toString(16).padStart(2, '0')).join('');
export const hexQuantity = (value) => `0x${value.toString(16)}`;
/** Requests to a device go one at a time (a Ledger answers one APDU at a time; a Trezor shows one request at a time). */
export function createSerialQueue() {
    let queue = Promise.resolve();
    return (run) => {
        const next = queue.then(run, run);
        queue = next.catch(() => undefined);
        return next;
    };
}
export function createDeviceState() {
    let rows = [];
    const listeners = new Set();
    const notify = () => listeners.forEach((l) => l());
    return {
        accounts: () => rows.map((r) => ({ ...r })),
        set(next) {
            rows = next;
            notify();
        },
        clear() {
            rows = [];
            notify();
        },
        find: (address) => rows.find((r) => r.address.toLowerCase() === String(address).toLowerCase()),
        onChange(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        notify,
    };
}
/** A personal-message signature as the apps expect it: 0x + r + s + v, with v 27 / 28 (some devices answer the parity 0 / 1). `v` may be a number or a hex string. */
export function messageSignature(r, s, v) {
    const vNumber = typeof v === 'number' ? v : parseInt(strip0x(String(v)), 16);
    const recovery = vNumber < 27 ? vNumber + 27 : vNumber;
    return `0x${strip0x(r).padStart(64, '0')}${strip0x(s).padStart(64, '0')}${recovery.toString(16).padStart(2, '0')}`;
}
/** Fill in what a device does not know (nonce, gas with a 20% margin, fees) so it can sign: an EIP-1559 transaction where the chain has a base fee, a legacy one where it has not. */
export async function prepareTransaction(rpc, tx) {
    const chainId = tx.chainId;
    const call = { from: tx.from, ...(tx.to ? { to: tx.to } : {}), ...(tx.data ? { data: tx.data } : {}), ...(tx.value !== undefined ? { value: hexQuantity(tx.value) } : {}) };
    const [nonceHex, gasHex, block] = await Promise.all([
        rpc(chainId, 'eth_getTransactionCount', [tx.from, 'pending']),
        rpc(chainId, 'eth_estimateGas', [call]),
        rpc(chainId, 'eth_getBlockByNumber', ['latest', false]),
    ]);
    const nonce = Number(BigInt(String(nonceHex)));
    const gas = (BigInt(String(gasHex)) * 12n) / 10n; // a margin over the estimate
    const base = block?.baseFeePerGas;
    const common = { chainId, nonce, gas, ...(tx.to ? { to: tx.to } : {}), ...(tx.data ? { data: tx.data } : {}), ...(tx.value !== undefined ? { value: tx.value } : {}) };
    if (base) {
        let tip = 1000000000n;
        try {
            tip = BigInt(String(await rpc(chainId, 'eth_maxPriorityFeePerGas', [])));
        }
        catch {
            /* a node without that call: one gwei */
        }
        return { type: 'eip1559', ...common, maxPriorityFeePerGas: tip, maxFeePerGas: BigInt(base) * 2n + tip };
    }
    const gasPrice = BigInt(String(await rpc(chainId, 'eth_gasPrice', [])));
    return { type: 'legacy', ...common, gasPrice };
}
/** The unsigned transaction as the hex a device signs (no 0x). */
export const unsignedHex = (unsigned) => strip0x(serializeTransaction(unsigned));
/** The signed raw transaction: the unsigned one plus the device's r, s and v (a typed transaction carries the parity 0 / 1, a legacy one the EIP-155 v). */
export function assembleSignedTransaction(unsigned, signature) {
    const v = typeof signature.v === 'bigint' ? signature.v : typeof signature.v === 'number' ? BigInt(signature.v) : BigInt(`0x${strip0x(String(signature.v)) || '0'}`);
    return serializeTransaction(unsigned, { r: `0x${strip0x(signature.r).padStart(64, '0')}`, s: `0x${strip0x(signature.s).padStart(64, '0')}`, v });
}
