// @ts-nocheck
import { buildHandler } from '../../readMethodRuntime';

const handler = buildHandler('getRoles', async (context) =>
    context.read.getRoles(String(context.methodArgs[0])),
);

export default handler;
