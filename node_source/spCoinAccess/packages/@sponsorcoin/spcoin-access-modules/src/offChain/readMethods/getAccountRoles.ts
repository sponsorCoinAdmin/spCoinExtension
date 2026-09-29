// @ts-nocheck
import { buildHandler } from '../../readMethodRuntime';

const handler = buildHandler('getAccountRoles', async (context) =>
    context.read.getAccountRoles(String(context.methodArgs[0])),
);

export default handler;
