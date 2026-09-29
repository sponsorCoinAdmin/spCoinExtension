// @ts-nocheck
import { buildHandler } from '../../readMethodRuntime';
const handler = buildHandler('getRecipientRecordList', async (context) => {
    const sponsorKey = String(context.methodArgs[0]);
    const recipientAccountList = context.methodArgs[1];
    return Promise.all(recipientAccountList.map(async (recipientKey) => ({
        recipientKey,
        recipientRecord: await context.requireExternalSerializedValue('getSerializedRecipientRecordList', [
            sponsorKey,
            recipientKey,
        ]),
    })));
});
export default handler;

