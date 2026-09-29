import { type Address } from 'viem';
export declare function normalizeAddress(input: string): string;
export declare function isAddress(input: string): input is Address;
export declare function toNormalizedAddress(input: string): Address;
