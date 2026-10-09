export declare function isNativePlaceholder(address: string | undefined): boolean;
export interface PreparedTransaction {
    to: string;
    /** Calldata; '0x' for a native send. */
    data: string;
    /** Wei, native sends only. */
    value?: bigint;
}
export type PrepareResult = {
    ok: true;
    tx: PreparedTransaction;
    amountWei: bigint;
} | {
    ok: false;
    message: string;
};
export interface TransferParams {
    recipientAddress: string | undefined;
    /** Present for an ERC20 send; omitted for a native send. */
    tokenAddress?: string;
    /** Required for an ERC20 send; native is always 18. */
    decimals?: number;
    /** Plain decimal string from the amount field. */
    amount: string;
}
/** "1.5" at 18 decimals -> 1500000000000000000n. null for anything that is not a plain non-negative decimal, or has too many places. */
export declare function parseDecimalToWei(amount: string, decimals: number): bigint | null;
/** ERC20 transfer(address,uint256) calldata: selector a9059cbb + 32-byte address + 32-byte amount. */
export declare function encodeErc20Transfer(to: string, amountWei: bigint): string;
/** Validate and turn the form into the transaction to send. */
export declare function prepareTransfer(params: TransferParams): PrepareResult;
export interface SendRequest {
    from: string;
    chainId: number;
    tx: PreparedTransaction;
    /** Confirmation-screen text. */
    title: string;
    amountLabel: string;
    recipientAddress: string;
}
export interface SendOutcome {
    hash: string;
    /** Whatever the host's transport returns after the transaction is mined (the web app shows gas used / block from it). */
    receipt?: unknown;
}
/** How a host signs and broadcasts. Throws on rejection or failure. */
export type SendTransport = (request: SendRequest) => Promise<SendOutcome>;
export interface ExecuteSendParams extends TransferParams {
    from: string;
    chainId: number;
    nativeSymbol: string;
    tokenSymbol?: string;
}
export type SendResult = ({
    ok: true;
} & SendOutcome) | {
    ok: false;
    message: string;
};
/** Prepare, then hand to the host's transport. Never throws: a rejected or failed send comes back as { ok: false, message }. */
export declare function executeSend(params: ExecuteSendParams, transport: SendTransport): Promise<SendResult>;
