import type { Wallet } from '../wallet/wallet';
export interface SignInParams {
    /** The hosted app's origin; '' (the default) is the page's own origin. */
    baseUrl?: string;
    address: string;
    /** Sign the server's challenge with the account (personal_sign); throw a readable message on rejection. */
    signMessage(message: string): Promise<string>;
    fetchImpl?: typeof fetch;
}
/** The challenge, the signature and the token: resolves with the bearer token. */
export declare function signInForToken({ baseUrl, address, signMessage, fetchImpl }: SignInParams): Promise<string>;
/** The same sign-in with the account's ACTIVE authenticator signing (the wallet resolves it: the saved choice, the account's source, the app default). A rejection in the wallet reads as one clear message. */
export declare function signInWithWallet(wallet: Pick<Wallet, 'authenticatorFor'>, params: Omit<SignInParams, 'signMessage'>): Promise<string>;
