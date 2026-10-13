import { HardwareError, type HardwareTransport } from './hardwareAuthenticator';
import { type ChainRpc } from './hardwareShared';
export type TrezorResponse<T> = {
    success: true;
    payload: T;
} | {
    success: false;
    payload: {
        error: string;
        code?: string;
    };
};
/** The slice of @trezor/connect-web this file uses (its default export). */
export interface TrezorConnectApi {
    init(settings: {
        manifest: {
            appName: string;
            appUrl: string;
            email: string;
        };
        lazyLoad?: boolean;
        popup?: boolean;
    }): Promise<void>;
    ethereumGetAddress(params: {
        bundle: Array<{
            path: string;
            showOnTrezor?: boolean;
        }>;
    }): Promise<TrezorResponse<Array<{
        address: string;
        serializedPath?: string;
    }>>>;
    ethereumSignMessage(params: {
        path: string;
        message: string;
        hex?: boolean;
    }): Promise<TrezorResponse<{
        address: string;
        signature: string;
    }>>;
    ethereumSignTransaction(params: {
        path: string;
        transaction: Record<string, unknown>;
    }): Promise<TrezorResponse<{
        v: string;
        r: string;
        s: string;
    }>>;
    dispose?(): void;
}
export interface TrezorTransportOptions {
    /** () => import('@trezor/connect-web'): loaded only when a device is first used. */
    loadConnect: () => Promise<{
        default: TrezorConnectApi;
    }>;
    /** Trezor Connect asks every app to say who it is. */
    manifest: {
        appName: string;
        appUrl: string;
        email: string;
    };
    /** A JSON-RPC call to the chain (the host's own RPC list). Needed to sign a transaction (nonce, gas, fees). */
    rpc: ChainRpc;
    /** How many accounts to offer (default 5). */
    accountCount?: number;
    isSupported?: () => boolean;
}
/** What went wrong, from Trezor Connect's error code, in the hardware error set. `during` says whether the person was connecting or asked to approve something. */
export declare function translateTrezorError(payload: {
    error?: string;
    code?: string;
} | undefined, during: 'connect' | 'sign'): HardwareError;
export type TrezorTransport = HardwareTransport;
export declare function createTrezorTransport(options: TrezorTransportOptions): TrezorTransport;
