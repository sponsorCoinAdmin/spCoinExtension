// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/swap/quoteClient.ts
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt, E8 / table row 20) -- the wallet's side of the hosted swap-quote service (services/swapQuote in
// the web repo): one small client that asks a base URL for a 0x price or quote. The web app can point it at its own /api/0x routes' successor or at
// the hosted service; the extension points it at the hosted service, because an extension cannot hold the 0x key. No keys here, and no host
// imports: the base URL and fetch are supplied.
export class QuoteServiceError extends Error {
    constructor(message, status, code) {
        super(message);
        this.status = status;
        this.code = code;
        this.name = 'QuoteServiceError';
    }
}
export function createQuoteClient(options) {
    const base = options.baseUrl.replace(/\/+$/, '');
    const doFetch = options.fetchImpl ?? ((...args) => fetch(...args));
    async function call(path, request) {
        const params = new URLSearchParams();
        params.set('chainId', String(request.chainId));
        params.set('sellToken', request.sellToken);
        params.set('buyToken', request.buyToken);
        if (request.sellAmount !== undefined)
            params.set('sellAmount', request.sellAmount);
        if (request.buyAmount !== undefined)
            params.set('buyAmount', request.buyAmount);
        if (request.taker)
            params.set('taker', request.taker);
        if (request.slippageBps !== undefined)
            params.set('slippageBps', String(request.slippageBps));
        let response;
        try {
            response = await doFetch(`${base}/${path}?${params.toString()}`);
        }
        catch (error) {
            throw new QuoteServiceError(error instanceof Error ? error.message : 'The quote service could not be reached.', 0);
        }
        const body = (await response.json().catch(() => ({})));
        if (!response.ok) {
            const code = typeof body.error === 'string' ? body.error : undefined;
            const message = typeof body.message === 'string' ? body.message : code ?? `The quote service answered ${response.status}.`;
            throw new QuoteServiceError(message, response.status, code);
        }
        return body;
    }
    return {
        getPrice: (request) => call('price', request),
        getQuote: (request) => call('quote', request),
    };
}
