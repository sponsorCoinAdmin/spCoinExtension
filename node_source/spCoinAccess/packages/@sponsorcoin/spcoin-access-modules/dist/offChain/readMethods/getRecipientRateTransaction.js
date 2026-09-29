// @ts-nocheck
import { buildHandler } from '../../readMethodRuntime';
const handler = buildHandler('getRecipientTransaction', async (context) => context.read.getRecipientTransaction(String(context.methodArgs[0]), String(context.methodArgs[1]), context.toStringOrNumber(context.methodArgs[2])));
export default handler;
