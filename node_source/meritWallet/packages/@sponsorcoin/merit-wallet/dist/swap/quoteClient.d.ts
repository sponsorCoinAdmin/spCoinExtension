export interface QuoteRequest {
    chainId: number;
    sellToken: string;
    buyToken: string;
    /** Base units. Give sellAmount or buyAmount. */
    sellAmount?: string;
    buyAmount?: string;
    /** Required for a firm quote, optional for a price. */
    taker?: string;
    slippageBps?: number;
}
export declare class QuoteServiceError extends Error {
    readonly status: number;
    readonly code?: string | undefined;
    constructor(message: string, status: number, code?: string | undefined);
}
export interface QuoteClient {
    /** Indicative price (no taker needed). */
    getPrice(request: QuoteRequest): Promise<Record<string, unknown>>;
    /** Firm quote with transaction data; needs `taker`. */
    getQuote(request: QuoteRequest & {
        taker: string;
    }): Promise<Record<string, unknown>>;
}
export declare function createQuoteClient(options: {
    baseUrl: string;
    fetchImpl?: typeof fetch;
}): QuoteClient;
