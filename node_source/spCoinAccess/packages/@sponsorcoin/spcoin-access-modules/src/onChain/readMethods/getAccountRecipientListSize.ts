// @ts-nocheck
import { buildHandler } from '../../readMethodRuntime';
import getAccountRecord from './getAccountRecord';

function toCount(value) {
    if (value == null) return null;
    const count = Number(value);
    return Number.isFinite(count) ? count : null;
}

const handler = buildHandler('getRecipientKeyCount', async (context) => {
    const accountKey = String(context.methodArgs[0]);
    try {
        const accountRecord = await getAccountRecord.run({ ...context, methodArgs: [accountKey] });
        const count = toCount(accountRecord?.recipientCount ?? accountRecord?.[6]);
        if (count != null) return count;
    } catch {
        // Older deployments can derive this from the recipient list.
    }
    const method =
        typeof context.read.getRecipientKeys === 'function'
            ? context.read.getRecipientKeys
            : context.read.getAccountRecipientList;
    const recipientList = context.normalizeStringListResult(await method(accountKey));
    return recipientList.length;
});
export default handler;

