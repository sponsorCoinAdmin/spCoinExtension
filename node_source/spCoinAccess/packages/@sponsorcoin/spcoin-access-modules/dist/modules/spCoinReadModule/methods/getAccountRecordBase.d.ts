export declare function getAccountRecordBase(context: any, accountKey: any): Promise<{
    accountKey: string;
    lastSponsorUpdateTimeStamp: string;
    lastRecipientUpdateTimeStamp: string;
    lastAgentUpdateTimeStamp: string;
    sponsorKeys: string[];
    recipientKeys: string[];
    parentRecipientKeys: string[];
}>;
