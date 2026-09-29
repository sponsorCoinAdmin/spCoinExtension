// @ts-nocheck
import { buildHandler } from '../../readMethodRuntime';
import { callGetAccountRecord, normalizeAccountRecordResult } from './getAccountRecord';

async function getLatestBlockClock(contract) {
  const provider = contract?.runner?.provider || contract?.runner;
  if (!provider || typeof provider.getBlock !== 'function') {
    return { latestBlockNumber: '', latestBlockTimeStamp: '' };
  }
  const block = await provider.getBlock('latest');
  return {
    latestBlockNumber: block?.number == null ? '' : String(block.number),
    latestBlockTimeStamp: block?.timestamp == null ? '' : String(block.timestamp),
  };
}

function toBigIntAmount(value) {
  const text = String(value ?? '0').replace(/,/g, '').trim();
  if (!text) return 0n;
  try {
    return BigInt(text);
  } catch {
    return 0n;
  }
}

function elapsedSeconds(latestBlockTimeStamp, updateTimeStamp) {
  const latest = toBigIntAmount(latestBlockTimeStamp);
  const update = toBigIntAmount(updateTimeStamp);
  return update > 0n && latest >= update ? (latest - update).toString() : '0';
}

function formatUnixSecondsTimestamp(value) {
  const raw = String(value ?? '').replace(/,/g, '').trim();
  if (!raw || raw === '0' || !/^\d+$/.test(raw)) return 'N/A';
  const seconds = Number(raw);
  if (!Number.isFinite(seconds) || seconds <= 0) return 'N/A';
  const date = new Date(seconds * 1000);
  if (Number.isNaN(date.getTime())) return 'N/A';
  const month = date.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  const hour24 = date.getHours();
  const hour12 = hour24 % 12 || 12;
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  const meridiem = hour24 < 12 ? 'a.m.' : 'p.m.';
  const timeZone =
    date
      .toLocaleTimeString('en-US', { timeZoneName: 'short' })
      .split(' ')
      .pop() || '';
  return `${month}-${day}-${year}, ${hour12}:${minute}:${second}.000 ${meridiem}${timeZone ? ` ${timeZone}` : ''}`;
}

const handler = buildHandler('getAccountRewardUpdateTimestamps', async (context) => {
  const accountKey = String(context.methodArgs[0] || '');
  const accountRecord = normalizeAccountRecordResult(
    await callGetAccountRecord(context.contract, accountKey),
    accountKey,
  );
  const blockClock = await getLatestBlockClock(context.contract);
  const wallClockTimeStamp = String(Math.floor(Date.now() / 1000));
  const lastSponsorUpdateTimeStamp = String(accountRecord.lastSponsorUpdateTimeStamp ?? '0');
  const lastRecipientUpdateTimeStamp = String(accountRecord.lastRecipientUpdateTimeStamp ?? '0');
  const lastAgentUpdateTimeStamp = String(accountRecord.lastAgentUpdateTimeStamp ?? '0');

  return {
    TYPE: '--ACCOUNT_REWARD_UPDATE_TIMESTAMPS--',
    accountKey: String(accountRecord.accountKey || accountKey),
    latestBlockNumber: blockClock.latestBlockNumber,
    latestBlockTimeStamp: blockClock.latestBlockTimeStamp,
    formattedLatestBlockTimeStamp: formatUnixSecondsTimestamp(blockClock.latestBlockTimeStamp),
    wallClockTimeStamp,
    formattedWallClockTimeStamp: formatUnixSecondsTimestamp(wallClockTimeStamp),
    lastSponsorUpdateTimeStamp,
    formattedLastSponsorUpdateTimeStamp: formatUnixSecondsTimestamp(lastSponsorUpdateTimeStamp),
    lastRecipientUpdateTimeStamp,
    formattedLastRecipientUpdateTimeStamp: formatUnixSecondsTimestamp(lastRecipientUpdateTimeStamp),
    lastAgentUpdateTimeStamp,
    formattedLastAgentUpdateTimeStamp: formatUnixSecondsTimestamp(lastAgentUpdateTimeStamp),
    secondsSinceSponsorUpdate: elapsedSeconds(blockClock.latestBlockTimeStamp, lastSponsorUpdateTimeStamp),
    secondsSinceRecipientUpdate: elapsedSeconds(blockClock.latestBlockTimeStamp, lastRecipientUpdateTimeStamp),
    secondsSinceAgentUpdate: elapsedSeconds(blockClock.latestBlockTimeStamp, lastAgentUpdateTimeStamp),
  };
});

export default handler;
