// @ts-nocheck
import { buildHandler } from '../../readMethodRuntime';

const handler = buildHandler('isSponsor', async (context) =>
    context.read.isSponsor(String(context.methodArgs[0])),
);

export default handler;
