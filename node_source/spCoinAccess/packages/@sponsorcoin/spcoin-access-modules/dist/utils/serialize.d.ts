import { AccountStruct } from "../dataTypes/spCoinDataTypes";
export declare const accountRewardTotalsInterface: any;
export declare const accountRecordInterface: any;
export declare const accountLinksInterface: any;
export declare const recipientRecordInterface: any;
export declare const recipientTransactionInterface: any;
export declare const agentTransactionInterface: any;
export declare function callViewFunction(contract: any, iface: any, functionName: any, args: any): Promise<any>;
export declare function readAnnualInflation(contract: any): Promise<any>;
export declare function readInitialTotalSupply(contract: any): Promise<any>;
export declare function normalizeAddress(value: any): string;
export declare function normalizeAddressList(values: any): any;
export declare function buildSerializedAccountRecordFallback(contract: any, accountKey: any): Promise<AccountStruct>;
export declare function buildSerializedAccountRewardsFallback(contract: any, accountKey: any): Promise<{
    sponsorRewards: string;
    recipientRewards: string;
    agentRewards: string;
}>;
export declare function buildSerializedRecipientRecordFallback(contract: any, sponsorKey: any, recipientKey: any): Promise<{
    sponsorKey: string;
    recipientKey: string;
    creationTime: string;
    stakedSPCoins: string;
    inserted: boolean;
}>;
export declare function buildSerializedRecipientRateFallback(contract: any, sponsorKey: any, recipientKey: any, recipientRateKey: any): Promise<{
    sponsorKey: string;
    recipientKey: string;
    recipientRateKey: string;
    creationTime: string;
    lastUpdateTime: string;
    stakedSPCoins: string;
    inserted: boolean;
}>;
export declare function buildSerializedAgentRateFallback(contract: any, sponsorKey: any, recipientKey: any, recipientRateKey: any, agentKey: any, agentRateKey: any): Promise<{
    sponsorKey: string;
    recipientKey: string;
    recipientRateKey: string;
    agentKey: string;
    agentRateKey: string;
    creationTime: string;
    lastUpdateTime: string;
    stakedSPCoins: string;
    inserted: boolean;
}>;
export declare class SpCoinSerialize {
    constructor(_spCoinContractDeployed: any);
}
