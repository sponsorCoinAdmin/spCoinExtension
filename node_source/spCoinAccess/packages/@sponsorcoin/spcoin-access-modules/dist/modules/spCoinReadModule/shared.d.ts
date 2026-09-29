export declare const SPONSOR = 0;
export declare const RECIPIENT = 1;
export declare const AGENT = 2;
export declare const getRewardType: (_accountType: any) => string;
export declare const getAccountTypeString: (_accountType: any) => "" | "AGENT" | "RECIPIENT" | "SPONSOR";
export declare const getSourceTypeDelimiter: (_accountType: any) => "RECIPIENT_ACCOUNT:" | "SPONSOR_ACCOUNT:";
