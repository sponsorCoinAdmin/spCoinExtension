import { type Hex, type TransactionSerializable } from 'viem';
import type { AuthenticatorTransaction } from './authenticator';
/** A JSON-RPC call to the chain (the host's own RPC list): needed to fill in a transaction before a device signs it, and to broadcast what it signed. */
export type ChainRpc = (chainId: number, method: string, params: unknown[]) => Promise<unknown>;
/** One account a device exposed. */
export interface DeviceAccount {
    address: string;
    name: string;
    path: string;
}
/** The Ledger Live account path (Ledger's own app and MetaMask default): m/44'/60'/<index>'/0/0 (no leading "m/"). */
export declare const ledgerLivePath: (index: number) => string;
/** The standard BIP-44 Ethereum path (Trezor Suite's default): m/44'/60'/0'/0/<index> (no leading "m/"). */
export declare const ethereumBip44Path: (index: number) => string;
export declare const strip0x: (hex: string) => string;
export declare const utf8Hex: (text: string) => string;
export declare const hexQuantity: (value: bigint) => Hex;
/** Requests to a device go one at a time (a Ledger answers one APDU at a time; a Trezor shows one request at a time). */
export declare function createSerialQueue(): <T>(run: () => Promise<T>) => Promise<T>;
/** The device state every transport keeps: the accounts it gave, whether one is open, and the listeners told when that changes. */
export interface DeviceState {
    accounts(): DeviceAccount[];
    set(rows: DeviceAccount[]): void;
    clear(): void;
    find(address: string): DeviceAccount | undefined;
    onChange(listener: () => void): () => void;
    /** Announce a change (a device unplugged, accounts read). */
    notify(): void;
}
export declare function createDeviceState(): DeviceState;
/** A personal-message signature as the apps expect it: 0x + r + s + v, with v 27 / 28 (some devices answer the parity 0 / 1). `v` may be a number or a hex string. */
export declare function messageSignature(r: string, s: string, v: number | string): string;
/** Fill in what a device does not know (nonce, gas with a 20% margin, fees) so it can sign: an EIP-1559 transaction where the chain has a base fee, a legacy one where it has not. */
export declare function prepareTransaction(rpc: ChainRpc, tx: AuthenticatorTransaction): Promise<TransactionSerializable>;
/** The unsigned transaction as the hex a device signs (no 0x). */
export declare const unsignedHex: (unsigned: TransactionSerializable) => string;
/** The signed raw transaction: the unsigned one plus the device's r, s and v (a typed transaction carries the parity 0 / 1, a legacy one the EIP-155 v). */
export declare function assembleSignedTransaction(unsigned: TransactionSerializable, signature: {
    r: string;
    s: string;
    v: string | number | bigint;
}): string;
