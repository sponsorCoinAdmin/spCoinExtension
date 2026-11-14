export interface ChainClock {
    /** Asks the chain for its newest block time (re-anchors when it moved) and returns the chain's "now" in seconds. Falls back to the last anchor when the chain cannot be asked. Throws only before any anchor exists. */
    now(): Promise<bigint>;
    /** The chain's "now" in seconds from the last anchor, without asking the chain (for a once-a-second tick). Throws before the first now(). */
    current(): bigint;
}
/**
 * @param readLatestBlockTimestamp the host's raw read: the newest block's timestamp in seconds (number, bigint or decimal string).
 * @param elapsedMs a monotonic-enough millisecond counter, only ever DIFFERENCED (default Date.now; tests inject their own).
 */
export declare function createChainClock(readLatestBlockTimestamp: () => Promise<bigint | number | string>, elapsedMs?: () => number): ChainClock;
