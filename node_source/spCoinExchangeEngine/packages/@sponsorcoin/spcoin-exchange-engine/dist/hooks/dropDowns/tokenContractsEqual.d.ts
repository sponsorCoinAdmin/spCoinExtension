import type { TokenContract } from '@sponsorcoin/spcoin-common/context';
/**
 * Returns true if two token contracts refer to the same address and chain,
 * with every other real field also matching. Address comparison is
 * case-insensitive.
 */
export declare const tokenContractsEqual: (a?: TokenContract, b?: TokenContract) => boolean;
