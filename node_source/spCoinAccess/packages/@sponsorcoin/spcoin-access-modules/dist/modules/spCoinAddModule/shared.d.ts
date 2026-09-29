export declare const BURN_ADDRESS = "0x0000000000000000000000000000000000000000";
export declare function isSameAddress(left: any, right: any): boolean;
export declare function getSignerAddress(_signer: any): Promise<any>;
export declare function requireBackDateRateTransactionSetOwner(context: any, signerAddress: any): Promise<void>;
export declare function normalizeRawQuantityUnits(_context: any, value: any): Promise<string>;
export declare function splitRawQuantityParts(context: any, value: any): Promise<{
    wholePart: string;
    fractionalPart: string;
}>;
