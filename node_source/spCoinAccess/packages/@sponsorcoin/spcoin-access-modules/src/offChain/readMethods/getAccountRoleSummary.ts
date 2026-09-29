// @ts-nocheck
import { buildHandler } from '../../readMethodRuntime';

const handler = buildHandler('getAccountRoleSummary', async (context) =>
    context.read.getAccountRoleSummary(String(context.methodArgs[0])),
);

export default handler;
