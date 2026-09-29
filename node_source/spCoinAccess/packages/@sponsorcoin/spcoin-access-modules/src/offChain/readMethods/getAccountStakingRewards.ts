// @ts-nocheck
import { buildHandler } from '../../readMethodRuntime';
const handler = buildHandler('getAccountStakingRewards', async (context) => context.read.getAccountStakingRewards(String(context.methodArgs[0])));
export default handler;

