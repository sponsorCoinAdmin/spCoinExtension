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
export function createChainClock(readLatestBlockTimestamp: () => Promise<bigint | number | string>, elapsedMs: () => number = () => Date.now()): ChainClock {
  let anchor: { chainSeconds: bigint; atMs: number } | undefined;
  const forward = (): bigint => {
    if (!anchor) throw new Error('The chain clock has not been read yet.');
    return anchor.chainSeconds + BigInt(Math.max(0, Math.floor((elapsedMs() - anchor.atMs) / 1000)));
  };
  return {
    async now() {
      const asked = elapsedMs();
      try {
        const latest = BigInt(await readLatestBlockTimestamp());
        // a block newer than the anchor becomes the anchor (the same rule as the web server's route); an equal or older one keeps counting from the anchor already held
        if (!anchor || latest > anchor.chainSeconds) anchor = { chainSeconds: latest, atMs: asked };
      } catch (error) {
        if (!anchor) throw error;
      }
      return forward();
    },
    current: forward,
  };
}
