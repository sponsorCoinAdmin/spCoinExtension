export declare function describeEthersError(error: unknown): string;
/**
 * Short, human-facing counterpart to describeEthersError's full diagnostic
 * dump — for ErrorMessage.reason (MessagePanel's own prominent "why this
 * happened" row), which wants one clean sentence, not a pipe-delimited
 * key=value list. Prefers ethers' own decoded `reason` (an actual revert
 * string, when the contract provided one), then `shortMessage`, then falls
 * back to the plain `.message` — same priority order describeEthersError
 * already uses internally, just returned as one value instead of appended
 * to a list.
 */
export declare function extractEthersErrorReason(error: unknown): string | undefined;
/**
 * Best-effort gas fee for ErrorMessage.gasFee — only meaningful when the
 * failure actually reached broadcast and produced a receipt (a revert after
 * gas was spent), which most write failures in this app never do (rejected
 * before signing, a locked-account error, insufficient funds caught by
 * estimateGas). Returns undefined rather than a misleading "0" when no
 * receipt is available.
 */
export declare function extractEthersErrorGasFee(error: unknown): string | undefined;
