export type RewardRoleName = 'Sponsor' | 'Recipient' | 'Agent';
export type RewardAction = 'estimate' | 'claim';

export interface RoleRewardState {
  amount?: string;
  available?: boolean;
  loading?: boolean;
  action?: RewardAction;
  error?: string;
  trace?: string;
}

export const REWARD_ROLES: readonly RewardRoleName[] = ['Sponsor', 'Recipient', 'Agent'];

export type RewardRoleConfig = {
  estimateMethod: string;
  claimMethod: string;
  pendingKey: string;
  roleFlag: string;
};

export const REWARD_ROLE_CONFIG: Record<RewardRoleName, RewardRoleConfig> = {
  Sponsor: {
    estimateMethod: 'estimateOffChainSponsorRewards',
    claimMethod: 'claimOnChainSponsorRewards',
    pendingKey: 'pendingSponsorRewards',
    roleFlag: 'isSponsor',
  },
  Recipient: {
    estimateMethod: 'estimateOffChainRecipientRewards',
    claimMethod: 'claimOnChainRecipientRewards',
    pendingKey: 'pendingRecipientRewards',
    roleFlag: 'isRecipient',
  },
  Agent: {
    estimateMethod: 'estimateOffChainAgentRewards',
    claimMethod: 'claimOnChainAgentRewards',
    pendingKey: 'pendingAgentRewards',
    roleFlag: 'isAgent',
  },
};

export const TOTAL_REWARD_CONFIG = {
  estimateMethod: 'estimateOffChainTotalRewards',
  claimMethod: 'claimOnChainTotalRewards',
} as const;

export const DISPLAY_MAX_FRACTION_DIGITS = 6;

export function readRecordValue(value: unknown, path: string[]): unknown {
  let current = value;
  for (const segment of path) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function normalizeDecimalString(value: unknown): string {
  if (value == null) return '0';
  if (typeof value === 'string') return value.trim() || '0';
  if (typeof value === 'number' || typeof value === 'bigint' || typeof value === 'boolean') return String(value).trim() || '0';
  return '0';
}

function formatIntegerTokenAmount(rawValue: string, decimals: number, maxFractionDigits = DISPLAY_MAX_FRACTION_DIGITS): string {
  const negative = rawValue.startsWith('-');
  const digits = negative ? rawValue.slice(1) : rawValue;
  const padded = digits.padStart(decimals + 1, '0');
  const whole = decimals > 0 ? padded.slice(0, padded.length - decimals) : padded;
  let fraction = decimals > 0 ? padded.slice(padded.length - decimals) : '';
  if (fraction.length > maxFractionDigits) fraction = fraction.slice(0, maxFractionDigits);
  fraction = fraction.replace(/0+$/, '');
  const formatted = fraction ? `${whole}.${fraction}` : whole || '0';
  return negative ? `-${formatted}` : formatted;
}

export function formatAccountRecordAmount(rawValue: unknown, decimals: number, maxFractionDigits = DISPLAY_MAX_FRACTION_DIGITS): string {
  const normalized = normalizeDecimalString(rawValue).replace(/,/g, '');
  if (!/^-?\d+(?:\.\d+)?$/.test(normalized)) return '0.0';
  if (/^-?\d+$/.test(normalized)) return formatIntegerTokenAmount(normalized, decimals, maxFractionDigits);
  const [wholePart, fractionPart = ''] = normalized.split('.');
  const cappedFraction = fractionPart.slice(0, maxFractionDigits).replace(/0+$/, '');
  return cappedFraction ? `${wholePart}.${cappedFraction}` : wholePart || '0';
}

export function addDecimalDisplayAmounts(values: unknown[]): string {
  const normalizedValues = values
    .map((value) => normalizeDecimalString(value).replace(/,/g, '').trim())
    .filter((value) => /^\d+(?:\.\d+)?$/.test(value));
  if (normalizedValues.length === 0) return '0.0';

  const scale = Math.max(
    0,
    ...normalizedValues.map((value) => value.split('.')[1]?.length ?? 0),
  );
  const total = normalizedValues.reduce((sum, value) => {
    const [whole, fraction = ''] = value.split('.');
    return sum + BigInt(`${whole}${fraction.padEnd(scale, '0')}`);
  }, BigInt(0));

  if (scale === 0) return total.toString();
  const digits = total.toString().padStart(scale + 1, '0');
  const whole = digits.slice(0, -scale) || '0';
  const fraction = digits.slice(-scale).replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole;
}

export function isZeroDisplayAmount(value: string): boolean {
  return /^-?0(\.0+)?$/.test(value.trim());
}

export function toRawRewardBigInt(value: unknown): bigint {
  const normalized = normalizeDecimalString(value).replace(/,/g, '').trim();
  if (!/^-?\d+$/.test(normalized)) return BigInt(0);
  try {
    return BigInt(normalized);
  } catch {
    return BigInt(0);
  }
}

export function parseServerSecondsValue(value: unknown): bigint {
  const match = /-?\d+/.exec(String(value ?? '').replace(/,/g, ''));
  if (!match) return BigInt(0);
  try {
    return BigInt(match[0]);
  } catch {
    return BigInt(0);
  }
}

export function getPendingRewardsTotalFromRecord(record: unknown): unknown {
  const pendingTotalRewards = readRecordValue(record, ['pendingTotalRewards']);
  const explicitTotal =
    readRecordValue(pendingTotalRewards, ['total']) ??
    readRecordValue(pendingTotalRewards, ['pendingTotalRewards']) ??
    readRecordValue(pendingTotalRewards, ['pendingRewards']) ??
    readRecordValue(pendingTotalRewards, ['totalRewards']) ??
    readRecordValue(record, ['total']) ??
    readRecordValue(record, ['pendingTotalRewards']) ??
    readRecordValue(record, ['pendingRewards']) ??
    readRecordValue(record, ['totalRewards']);
  const componentTotal =
    toRawRewardBigInt(readRecordValue(record, ['pendingSponsorRewards'])) +
    toRawRewardBigInt(readRecordValue(record, ['pendingRecipientRewards'])) +
    toRawRewardBigInt(readRecordValue(record, ['pendingAgentRewards']));
  return componentTotal > BigInt(0) ? componentTotal.toString() : explicitTotal;
}

export function getRewardResultAmount(result: unknown, role: RewardRoleName): unknown {
  if (typeof result === 'string' || typeof result === 'number' || typeof result === 'bigint') return result;
  const roleConfig = REWARD_ROLE_CONFIG[role];
  return (
    readRecordValue(result, [roleConfig.pendingKey]) ??
    readRecordValue(result, ['pendingTotalRewards']) ??
    readRecordValue(result, ['pendingRewards']) ??
    readRecordValue(result, ['claimedAmount']) ??
    readRecordValue(result, ['meta', 'rewardCalculation', roleConfig.pendingKey])
  );
}

export function getClaimSettlementEntry(result: unknown): Record<string, unknown> | undefined {
  if (!Array.isArray(result)) return undefined;
  return result.find(
    (entry): entry is Record<string, unknown> =>
      !!entry && typeof entry === 'object' && !Array.isArray(entry) && 'settlementTimestamp' in (entry as Record<string, unknown>),
  );
}

export function getTotalRewardResultRoleAmount(result: unknown, role: RewardRoleName): unknown {
  if (!result || typeof result !== 'object' || Array.isArray(result)) return undefined;
  const roleConfig = REWARD_ROLE_CONFIG[role];
  return (
    readRecordValue(result, [roleConfig.pendingKey]) ??
    readRecordValue(result, ['pendingTotalRewards', roleConfig.pendingKey]) ??
    readRecordValue(result, ['pendingRewards', roleConfig.pendingKey]) ??
    readRecordValue(result, ['meta', 'rewardCalculation', roleConfig.pendingKey])
  );
}

export function getTotalRewardResultAmount(result: unknown): unknown {
  if (typeof result === 'string' || typeof result === 'number' || typeof result === 'bigint') return result;
  return (
    getPendingRewardsTotalFromRecord(result) ??
    readRecordValue(result, ['claimedAmount']) ??
    readRecordValue(result, ['meta', 'rewardCalculation', 'pendingTotalRewards', 'total']) ??
    readRecordValue(result, ['meta', 'rewardCalculation', 'pendingTotalRewards'])
  );
}

export function getAccountRecordPendingReward(record: unknown, role: RewardRoleName): unknown {
  const roleConfig = REWARD_ROLE_CONFIG[role];
  return (
    readRecordValue(record, ['totalSpCoins', 'pendingRewards', roleConfig.pendingKey]) ??
    readRecordValue(record, ['pendingRewards', roleConfig.pendingKey]) ??
    readRecordValue(record, [roleConfig.pendingKey])
  );
}
