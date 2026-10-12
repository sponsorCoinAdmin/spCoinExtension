export interface TransferSeal {
    /** The extension's one-time public key (base64, raw P-256 point). */
    publicKey: string;
    iv: string;
    ciphertext: string;
}
/** The asking page: a one-time key pair. `publicKey` goes to the extension; `open` turns the extension's blob back into the private key. */
export declare function createTransferRequest(): Promise<{
    publicKey: string;
    open(seal: TransferSeal, address: string): Promise<string>;
}>;
/** The extension: seal the account's private key for the page that asked. The address is bound in as authenticated data. */
export declare function sealForTransfer(privateKey: string, address: string, requesterPublicKey: string): Promise<TransferSeal>;
/** What the asking page needs from the wallet's provider: the EIP-1193 request. */
export interface TransferProvider {
    request(args: {
        method: string;
        params?: unknown[];
    }): Promise<unknown>;
}
/**
 * The asking page, start to finish: make a one-time key, ask the wallet for `address` (the person approves in the WALLET's own screen and types its password), open the sealed blob and hand back the private key.
 * The caller imports it into its own vault at once and keeps nothing; the wallet's answer is useless to anyone but this call. Throws the wallet's error (a refusal is code 4001).
 */
export declare function requestAccountFromProvider(provider: TransferProvider, address: string): Promise<string>;
