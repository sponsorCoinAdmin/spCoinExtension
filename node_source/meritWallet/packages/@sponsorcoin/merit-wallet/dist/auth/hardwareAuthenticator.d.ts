import { type Authenticator, type AuthenticatorTransaction } from './authenticator';
export type HardwareErrorCode = 'rejected' | 'locked' | 'app_closed' | 'not_connected' | 'unavailable' | 'unsupported';
/** What a transport reports when the device refuses or cannot act. */
export declare class HardwareError extends Error {
    readonly code: HardwareErrorCode;
    constructor(code: HardwareErrorCode, message: string);
}
/** The ONE interface a device library (WebHID Ledger, QR, ...) implements for this package. Plain request / reply shapes, nothing device-specific leaks out. */
export interface HardwareTransport {
    /** The device family for the wallet's name: 'ledger', 'trezor', 'qr'. */
    readonly kind: string;
    /** True when this browser can talk to the device at all (WebHID present, a secure page). */
    isSupported(): boolean;
    /** True while a device is open and its Ethereum app is ready. */
    isConnected(): boolean;
    /** Needs a user gesture: open the device (the browser's permission prompt) and return the accounts it exposes. */
    connect(): Promise<Array<{
        address: string;
        name?: string;
        path?: string;
    }>>;
    /** Close the device. Never touches keys. */
    disconnect(): Promise<void>;
    /** The accounts of the open device. */
    accounts(): Array<{
        address: string;
        name?: string;
        path?: string;
    }>;
    /** Sign inside the device after its approval; throws HardwareError('rejected') when the person declines on the device. */
    signMessage(address: string, message: string): Promise<string>;
    /** Sign a transaction inside the device; returns the RAW signed transaction (the app broadcasts it). */
    signTransaction(tx: AuthenticatorTransaction): Promise<string>;
    /** Connected / disconnected / accounts changed announcements (a plug pulled out). */
    onChange(listener: () => void): () => void;
}
export interface HardwareAuthenticatorOptions {
    /** Send a raw signed transaction to the chain and return its hash (the device signs, the app broadcasts). */
    broadcast(rawTransaction: string, chainId: number): Promise<string>;
}
export declare function createHardwareAuthenticator(transport: HardwareTransport, options: HardwareAuthenticatorOptions): Authenticator;
