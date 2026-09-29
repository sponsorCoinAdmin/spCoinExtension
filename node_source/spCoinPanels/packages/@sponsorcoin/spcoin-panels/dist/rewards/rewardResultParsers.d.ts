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
export declare const REWARD_ROLES: readonly RewardRoleName[];
export type RewardRoleConfig = {
    estimateMethod: string;
    claimMethod: string;
    pendingKey: string;
    roleFlag: string;
};
export declare const REWARD_ROLE_CONFIG: Record<RewardRoleName, RewardRoleConfig>;
export declare const TOTAL_REWARD_CONFIG: {
    readonly estimateMethod: "estimateOffChainTotalRewards";
    readonly claimMethod: "claimOnChainTotalRewards";
};
export declare const DISPLAY_MAX_FRACTION_DIGITS = 6;
export declare function readRecordValue(value: unknown, path: string[]): unknown;
export declare function formatAccountRecordAmount(rawValue: unknown, decimals: number, maxFractionDigits?: number): string;
export declare function addDecimalDisplayAmounts(values: unknown[]): string;
export declare function isZeroDisplayAmount(value: string): boolean;
export declare function toRawRewardBigInt(value: unknown): bigint;
export declare function parseServerSecondsValue(value: unknown): bigint;
export declare function getPendingRewardsTotalFromRecord(record: unknown): unknown;
export declare function getRewardResultAmount(result: unknown, role: RewardRoleName): unknown;
export declare function getClaimSettlementEntry(result: unknown): Record<string, unknown> | undefined;
export declare function getTotalRewardResultRoleAmount(result: unknown, role: RewardRoleName): unknown;
export declare function getTotalRewardResultAmount(result: unknown): unknown;
export declare function getAccountRecordPendingReward(record: unknown, role: RewardRoleName): unknown;
