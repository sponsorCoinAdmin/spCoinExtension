// @ts-nocheck
import { buildHandler } from '../../readMethodRuntime';

const handler = buildHandler('isAgent', async (context) =>
    context.read.isAgent(String(context.methodArgs[0])),
);

export default handler;
