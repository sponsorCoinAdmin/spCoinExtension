declare const handler: import("../../readMethodRuntime").ReadMethodHandler<{
    TYPE: string;
    accountKey: string;
    latestBlockNumber: string;
    latestBlockTimeStamp: string;
    formattedLatestBlockTimeStamp: string;
    wallClockTimeStamp: string;
    formattedWallClockTimeStamp: string;
    lastSponsorUpdateTimeStamp: string;
    formattedLastSponsorUpdateTimeStamp: string;
    lastRecipientUpdateTimeStamp: string;
    formattedLastRecipientUpdateTimeStamp: string;
    lastAgentUpdateTimeStamp: string;
    formattedLastAgentUpdateTimeStamp: string;
    secondsSinceSponsorUpdate: string;
    secondsSinceRecipientUpdate: string;
    secondsSinceAgentUpdate: string;
}>;
export default handler;
