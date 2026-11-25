// File: src/chainClients.ts
//
// 2026-11-19 -- the one place the browser host builds a chain client and waits for a receipt. Before this the send, the trade executor, the engine hosts and the component each built their own client, and the send and the trade each had their own
// receipt waiter. A client is cached per endpoint (building one allocates a transport; the engine asks for one on every render of a chain change), and there is one receipt shape: the richer one the swap flow reads, which also satisfies the send's result card.
import { createPublicClient, http } from 'viem';
const clients = new Map();
/** A read-only client for a JSON-RPC endpoint, built once per endpoint. The endpoint can carry an access token, so it is only ever a map key in memory here (never logged or traced). */
export function publicClientFor(rpcUrl) {
    let client = clients.get(rpcUrl);
    if (!client) {
        client = createPublicClient({ transport: http(rpcUrl) });
        clients.set(rpcUrl, client);
    }
    return client;
}
/** Wait for a transaction to be mined; null when it is not mined in time or the node cannot be reached (the transaction was sent, so a slow node only means the result card has no block details). */
export async function waitForReceipt(rpcUrl, hash, timeoutMs = 60000) {
    try {
        const r = await publicClientFor(rpcUrl).waitForTransactionReceipt({ hash: hash, timeout: timeoutMs });
        return { blockNumber: Number(r.blockNumber), gasUsed: r.gasUsed, gasPrice: r.effectiveGasPrice, status: r.status === 'success' ? 1 : 0, to: r.to ?? null, from: r.from, contractAddress: r.contractAddress ?? null };
    }
    catch {
        return null;
    }
}
