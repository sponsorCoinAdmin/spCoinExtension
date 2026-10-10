// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/chain/directReads.ts
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt, E4 / table row 16) -- reads straight from the chain's RPC with viem, MetaMask style (the wallet
// talks to the node itself), so a host that has no Next.js server (the extension) does not need /api/spCoin/run-script for simple contract views.
// Works for any ABI; the extension uses it for the spCoin rate increments the stake flow needs. A host may inject a viem transport (tests do).
import { createPublicClient, http } from 'viem';
/** One contract view call. Throws with the node's message when the call fails. */
export async function readContractDirect(params) {
    const client = createPublicClient({ transport: params.transport ?? http(params.rpcUrl) });
    return client.readContract({
        address: params.address,
        abi: params.abi,
        functionName: params.functionName,
        args: params.args,
    });
}
/** Results go through JSON in run-script, so numbers come back as decimal strings; keep that shape for callers that already expect it. */
export function toRunScriptShape(value) {
    if (typeof value === 'bigint')
        return value.toString();
    if (Array.isArray(value))
        return value.map(toRunScriptShape);
    if (value && typeof value === 'object')
        return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, toRunScriptShape(v)]));
    return value;
}
/**
 * A view that returns several NAMED outputs comes back from viem as an array; the run-script route returned an object keyed by the output names
 * (getRecipientTransaction -> { recipientRateKey, stakedSPCoins, ... }), and callers read it that way. Rebuild that object; anything else is unchanged.
 */
export function namedOutputsShape(abi, functionName, value) {
    const fn = abi.find((e) => e.type === 'function' && e.name === functionName);
    const outputs = fn?.outputs ?? [];
    if (outputs.length > 1 && outputs.every((o) => !!o.name) && Array.isArray(value)) {
        return Object.fromEntries(outputs.map((o, i) => [o.name, value[i]]));
    }
    return value;
}
/**
 * A read step with the same call shape as the run-script one (params, method name, key/value args) answered by readContractDirect. Returns
 * undefined when `method` is not in `abi`, so a host can fall back to its other transport for methods that need more than one contract call.
 */
export function createDirectReadStep(abi, transportFor) {
    const names = new Set(abi.filter((e) => e.type === 'function').map((e) => e.name));
    return {
        handles: (method) => names.has(method),
        read: async (params, method, args = []) => {
            const p = params;
            const value = await readContractDirect({
                rpcUrl: p.rpcUrl,
                address: p.contractAddress,
                abi,
                functionName: method,
                args: args.map((a) => a.value),
                transport: transportFor?.(p.rpcUrl),
            });
            return toRunScriptShape(namedOutputsShape(abi, method, value));
        },
    };
}
