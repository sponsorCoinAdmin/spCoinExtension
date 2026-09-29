export declare function callGetAccountRecord(contract: any, accountKey: any): Promise<any>;
export declare function normalizeAccountRecordResult(result: any, requestedAccountKey: any): {
    [k: string]: any;
};
declare const handler: import("../../readMethodRuntime").ReadMethodHandler<{
    [k: string]: any;
}>;
export default handler;
