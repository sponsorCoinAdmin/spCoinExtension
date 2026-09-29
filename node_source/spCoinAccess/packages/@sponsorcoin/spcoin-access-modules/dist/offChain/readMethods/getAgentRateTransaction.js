// @ts-nocheck
import { buildHandler } from '../../readMethodRuntime';
const handler = buildHandler('getAgentTransaction', async (context) => context.read.getAgentTransaction(String(context.methodArgs[0]), String(context.methodArgs[1]), context.toStringOrNumber(context.methodArgs[2]), String(context.methodArgs[3]), context.toStringOrNumber(context.methodArgs[4])));
export default handler;
