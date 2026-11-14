// File: src/rewards/chainClock.ts
//
// 2026-11-14 (owner: "the calculated results need to be identical regardless of the time zone"): the ONE source of "now" for every reward figure the wallet shows (the Rewards page's estimate, the Claim lists' per-row amounts,
// Auto Refresh ticks), in every app (web app on localhost or sponsorcoin.org, the extension).
//
// Time zones do not matter (a Unix time is the same number everywhere); the SOURCE of the clock does. The contract settles rewards against block.timestamp, so the estimate must count from the chain's time, not from the
// time on the computer showing it (a computer's own clock can be seconds or minutes off, and a local fork's chain can sit hours behind it). The rule, the same one the web server's run-script route uses:
//   - the newest block's time is the anchor, taken from the chain (the host supplies only that raw read);
//   - between blocks it counts forward with the computer's elapsed time (so a figure keeps climbing while the chain is idle);
//   - when a newer block shows up it replaces the anchor, so drift never builds up.
// There is no use of the computer's calendar time or time zone anywhere in this file; only elapsed time (differences of its clock) is used.
/**
 * The chain's time right now, from the node, in seconds. A node that has a pending block (Hardhat, most full nodes) reports the time the NEXT block would carry; that is the moment a claim sent now would settle at, and on an idle
 * local fork (no block for hours) it is the only value that keeps up with the fork's own clock. Without a pending block it falls back to the newest block's time.
 * @param rpc one JSON-RPC call on the host's node: (method, params) => result (ethers: provider.send, viem: client.request).
 */
export async function readChainTimestamp(rpc) {
    const stamp = (block) => {
        const t = block?.timestamp;
        return t === undefined || t === null ? undefined : BigInt(t);
    };
    try {
        const pending = stamp(await rpc('eth_getBlockByNumber', ['pending', false]));
        if (pending !== undefined)
            return pending;
    }
    catch {
        /* no pending block on this node: use the newest */
    }
    const latest = stamp(await rpc('eth_getBlockByNumber', ['latest', false]));
    if (latest === undefined)
        throw new Error('The chain returned no block.');
    return latest;
}
/**
 * @param readLatestBlockTimestamp the host's raw read: the newest block's timestamp in seconds (number, bigint or decimal string).
 * @param elapsedMs a monotonic-enough millisecond counter, only ever DIFFERENCED (default Date.now; tests inject their own).
 */
export function createChainClock(readLatestBlockTimestamp, elapsedMs = () => Date.now()) {
    let anchor;
    const forward = () => {
        if (!anchor)
            throw new Error('The chain clock has not been read yet.');
        return anchor.chainSeconds + BigInt(Math.max(0, Math.floor((elapsedMs() - anchor.atMs) / 1000)));
    };
    return {
        async now() {
            const asked = elapsedMs();
            try {
                const latest = BigInt(await readLatestBlockTimestamp());
                // a block newer than the anchor becomes the anchor (the same rule as the web server's route); an equal or older one keeps counting from the anchor already held
                if (!anchor || latest > anchor.chainSeconds)
                    anchor = { chainSeconds: latest, atMs: asked };
            }
            catch (error) {
                if (!anchor)
                    throw error;
            }
            return forward();
        },
        current: forward,
    };
}
