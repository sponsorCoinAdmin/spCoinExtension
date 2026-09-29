// @ts-nocheck
import { bigIntToDateTimeString, bigIntToDecString } from '../../utils/dateTime';
import { buildHandler } from '../../readMethodRuntime';
const handler = buildHandler('getRecipientTransactionList', async (context) => {
    const rates = (await (
        context.contract.getSponsorRecipientRates?.(context.methodArgs[0], context.methodArgs[1]) ??
        context.contract.getSponsorRecipientRateKeys?.(context.methodArgs[0], context.methodArgs[1]) ??
        context.contract.getRecipientRateList?.(context.methodArgs[0], context.methodArgs[1])
    )) ?? [];
    return Promise.all(rates.map(async (rate) => {
        const [, , , creationTime, lastUpdateTime, stakedSPCoins] = await context.contract.getRecipientTransaction(context.methodArgs[0], context.methodArgs[1], rate);
        const serializedRecipientTransaction = [
            String(creationTime ?? '0'),
            String(lastUpdateTime ?? '0'),
            String(stakedSPCoins ?? '0'),
        ].join(',');
        const recordFields = serializedRecipientTransaction.split(',');
        return {
            recipientRateKey: String(rate),
            serializedRecipientTransaction: {
                serializedRecipientTransaction,
                creationTime: bigIntToDateTimeString(recordFields[0] || '0'),
                lastUpdateTime: bigIntToDateTimeString(recordFields[1] || '0'),
                stakedSPCoins: bigIntToDecString(recordFields[2] || '0'),
            },
        };
    }));
});
export default handler;

