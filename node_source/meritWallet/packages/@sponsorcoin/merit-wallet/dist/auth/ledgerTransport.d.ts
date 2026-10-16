import { HardwareError, type HardwareTransport } from './hardwareAuthenticator';
import { ledgerLivePath, type ChainRpc } from './hardwareShared';
export { ledgerLivePath };
/** The slice of @ledgerhq/hw-transport-webhid this file uses (its default export). */
export interface LedgerHidTransportClass {
    isSupported?(): Promise<boolean>;
    create(): Promise<LedgerHidDevice>;
    /** Reopens a device the person already granted, without a prompt; null when there is none. */
    openConnected?(): Promise<LedgerHidDevice | null>;
}
export interface LedgerHidDevice {
    close(): Promise<void>;
    on?(event: string, listener: () => void): void;
}
/** The slice of @ledgerhq/hw-app-eth this file uses (its default export is a class taking the device). */
export interface LedgerEthApp {
    getAddress(path: string, display?: boolean): Promise<{
        address: string;
    }>;
    signPersonalMessage(path: string, messageHex: string): Promise<{
        v: number | string;
        r: string;
        s: string;
    }>;
    signTransaction(path: string, rawTxHex: string, resolution?: unknown): Promise<{
        v: string;
        r: string;
        s: string;
    }>;
}
export type LedgerEthAppClass = new (device: LedgerHidDevice) => LedgerEthApp;
export interface LedgerTransportOptions {
    /** () => import('@ledgerhq/hw-transport-webhid'): loaded only when a device is opened. */
    loadTransport: () => Promise<{
        default: LedgerHidTransportClass;
    }>;
    /** () => import('@ledgerhq/hw-app-eth'). */
    loadEthApp: () => Promise<{
        default: LedgerEthAppClass | {
            default: LedgerEthAppClass;
        };
    }>;
    /** A JSON-RPC call to the chain (the host's own RPC list). Needed to sign a transaction (nonce, gas, fees). */
    rpc: ChainRpc;
    /** How many accounts of the Ledger Live path to offer (default 5). */
    accountCount?: number;
    /** Optional: Ledger's clear-signing resolution for a transaction (token / NFT names on the device screen). Without it a contract call needs "blind signing" enabled on the device. */
    resolveTransaction?: (rawTxHex: string) => Promise<unknown>;
    /** Overrides, for tests and hosts that know better. */
    isSupported?: () => boolean;
}
/** Ledger status words and transport errors -> the hardware error set. */
export declare function translateLedgerError(error: unknown): HardwareError;
/** The Ledger transport: the common interface plus restore() (reopen a device granted earlier, no prompt). */
export type LedgerTransport = HardwareTransport & {
    restore(): Promise<{
        address: string;
        name?: string;
        path?: string;
    }[]>;
};
export declare function createLedgerTransport(options: LedgerTransportOptions): LedgerTransport;
