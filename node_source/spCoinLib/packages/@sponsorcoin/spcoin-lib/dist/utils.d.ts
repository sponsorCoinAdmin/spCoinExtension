export declare const stringifyBigInt: (obj: unknown) => string;
/**
 * Truncates a long address by keeping `start` chars at the front and `end`
 * chars at the back, joined with "...". Safe to call on any string.
 */
export declare const truncateMiddle: (addr: string, start?: number, end?: number) => string;
