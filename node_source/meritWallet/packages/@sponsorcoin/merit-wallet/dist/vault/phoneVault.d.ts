import type { Authenticator, AuthenticatorTransaction } from '../auth/authenticator';
import { type VaultCapability } from './vaultCapability';
export interface PhoneAccount {
    address: string;
    name?: string;
}
/** What the native key manager reports when the person cancels or fails the biometric prompt. */
export type PhoneAuthErrorCode = 'cancelled' | 'failed' | 'locked_out' | 'unavailable';
export declare class PhoneAuthError extends Error {
    readonly code: PhoneAuthErrorCode;
    /** For 'locked_out': how long until the device accepts another try. */
    readonly retryAfterMs?: number;
    constructor(code: PhoneAuthErrorCode, message: string, retryAfterMs?: number);
}
/** The ONE interface native code implements. Every secret stays inside it. */
export interface PhoneKeyManager {
    /** 'ios', 'android', ...: for the words on the screens. */
    readonly platform: string;
    /** True when the biometric / device passcode can be used right now. */
    isAvailable(): Promise<boolean>;
    /** True once a wallet exists on this device. */
    isSetUp(): Promise<boolean>;
    /** Generate the wallet inside the secure element. The recovery phrase, when the platform allows one, is returned ONCE here and never again. */
    setUp(): Promise<{
        recoveryPhrase?: string;
        accounts: PhoneAccount[];
    }>;
    /** Show the biometric (or passcode) prompt with this reason. Resolves when the person passed it; throws PhoneAuthError otherwise. Opens the manager for signing. */
    authenticate(reason: string): Promise<void>;
    isUnlocked(): boolean;
    lock(): void;
    accounts(): PhoneAccount[];
    addAccount(name?: string): Promise<PhoneAccount>;
    /** Sign inside the secure element. Throws PhoneAuthError('cancelled') if the person declines. */
    signMessage(address: string, message: string): Promise<string>;
    /** Sign a transaction inside the secure element; returns the RAW signed transaction (the app broadcasts it). */
    signTransaction(tx: AuthenticatorTransaction): Promise<string>;
    /** Remove the wallet from the device (the manager asks for the biometric itself). Irreversible. */
    deleteWallet(): Promise<void>;
    /** Lock / unlock / accounts changed announcements (an app going to the background locks it). */
    onChange(listener: () => void): () => void;
}
/** The phone's key manager as a VaultCapability. The credential is always a biometric / device unlock: the manager shows the prompt, so the credential's value is ignored. */
export declare function createPhoneVault(manager: PhoneKeyManager): VaultCapability;
export interface PhoneAuthenticatorOptions {
    /** Sends a raw signed transaction to the chain and returns its hash (the app's own RPC call; the key manager never talks to the network). */
    broadcast(rawTransaction: string, chainId: number): Promise<string>;
}
/** The phone's key manager as an Authenticator ('deviceVault'). Every signature is behind the key manager's own approval; a locked wallet is an error, not a silent unlock. */
export declare function createPhoneAuthenticator(manager: PhoneKeyManager, options: PhoneAuthenticatorOptions): Authenticator;
