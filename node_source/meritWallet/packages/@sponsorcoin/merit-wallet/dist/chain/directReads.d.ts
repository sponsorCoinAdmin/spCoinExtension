import { type Abi, type Transport } from 'viem';
export interface DirectReadParams {
    rpcUrl: string;
    address: string;
    abi: Abi;
    functionName: string;
    args?: readonly unknown[];
    /** Replace the default http(rpcUrl) transport. */
    transport?: Transport;
}
/** One contract view call. Throws with the node's message when the call fails. */
export declare function readContractDirect(params: DirectReadParams): Promise<unknown>;
/** Results go through JSON in run-script, so numbers come back as decimal strings; keep that shape for callers that already expect it. */
export declare function toRunScriptShape(value: unknown): unknown;
/**
 * A view that returns several NAMED outputs comes back from viem as an array; the run-script route returned an object keyed by the output names
 * (getRecipientTransaction -> { recipientRateKey, stakedSPCoins, ... }), and callers read it that way. Rebuild that object; anything else is unchanged.
 */
export declare function namedOutputsShape(abi: Abi, functionName: string, value: unknown): unknown;
export interface DirectReadStepParams {
    contractAddress: string;
    rpcUrl: string;
}
/**
 * A read step with the same call shape as the run-script one (params, method name, key/value args) answered by readContractDirect. Returns
 * undefined when `method` is not in `abi`, so a host can fall back to its other transport for methods that need more than one contract call.
 */
export declare function createDirectReadStep(abi: Abi, transportFor?: (rpcUrl: string) => Transport | undefined): {
    handles: (method: string) => boolean;
    read: (params: DirectReadParams | DirectReadStepParams, method: string, args?: {
        key: string;
        value: string;
    }[]) => Promise<unknown>;
};
