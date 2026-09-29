// @ts-nocheck
import { buildHandler } from '../../readMethodRuntime';

const handler = buildHandler('getRecipientKeys', async (context) => {
    const method =
        typeof context.read.getRecipientKeys === 'function'
            ? context.read.getRecipientKeys
            : context.read.getAccountRecipientList;
    return context.normalizeStringListResult(await method(String(context.methodArgs[0])));
});

export default handler;
