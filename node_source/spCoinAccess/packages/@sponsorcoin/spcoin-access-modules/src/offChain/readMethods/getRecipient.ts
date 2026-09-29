// @ts-nocheck
import { buildHandler } from '../../readMethodRuntime';
const handler = buildHandler('getRecipient', async (context) => {
    const readMethod = context.read.getRecipient || context.read.getRecipientRecord;
    return readMethod(String(context.methodArgs[0]), String(context.methodArgs[1]));
});
export default handler;

