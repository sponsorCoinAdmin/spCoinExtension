// @ts-nocheck
import { buildHandler } from '../../readMethodRuntime';
const handler = buildHandler('getAccountRecordShallow', async (context) => context.read.getAccountRecordShallow(String(context.methodArgs[0])));
export default handler;
