/**
 * `undefined` (never throws) only for a not-yet-a-number mid-type state ("." or text that is not a number): the caller skips the push and keeps the text as typed.
 * "" is an amount of 0. "12." is 12. ".5" is 0.5.
 */
export declare function parseDecimalAmount(text: string, decimals: number): bigint | undefined;
