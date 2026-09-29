// @ts-nocheck
import { buildHandler } from '../../readMethodRuntime';

const handler = buildHandler('isRecipient', async (context) =>
    context.read.isRecipient(String(context.methodArgs[0])),
);

export default handler;
