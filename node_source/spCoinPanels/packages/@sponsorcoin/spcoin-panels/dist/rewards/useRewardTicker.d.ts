import type { RewardRoleName } from './rewardResultParsers';
export interface RewardTickAnchor {
    amount: bigint;
    tsSeconds: bigint;
    ratePerSecond: bigint;
    capturedAtWallClockMs: number;
}
export interface UseRewardTickerParams {
    /** Whether auto-refresh is active — gates the setInterval effect. */
    autoRefresh: boolean;
    /** Whether the parent panel is currently visible. */
    isActive: boolean;
    /** Token decimals for display formatting. */
    decimals: number;
    /** Key to namespace anchors when driving multiple displays from one hook. */
    tickKey?: 'Total' | 'Sponsor' | 'Recipient' | 'Agent';
}
export interface UseRewardTickerResult {
    /** Live-formatted amount string, ticking every second when autoRefresh is on. */
    displayAmount: string;
    /** Call after each data fetch to update the anchor point. Computes ratePerSecond from the delta. */
    updateAnchor: (amount: bigint, tsSeconds: bigint) => void;
    /** Clear all anchors (e.g., on account/contract switch). */
    clearAnchors: () => void;
}
export declare function useRewardTicker({ autoRefresh, isActive, decimals, tickKey, }: UseRewardTickerParams): UseRewardTickerResult;
export type RewardTickKey = 'Total' | RewardRoleName;
export interface UseRewardTickerMultiParams {
    autoRefresh: boolean;
    isActive: boolean;
    decimals: number;
    onTick: (liveAmounts: Partial<Record<RewardTickKey, string>>) => void;
    /** Optional gate — the interval won't start until the caller confirms a
     *  real rate is known (e.g. after a second on-chain read lands). Mirrors
     *  the web app's hasConfirmedRate guard. Omit if not needed (extension
     *  ticks as soon as autoRefresh+isActive). */
    hasConfirmedRate?: boolean;
    tickKey?: string;
}
export declare function useRewardTickerMulti({ autoRefresh, isActive, decimals, onTick, hasConfirmedRate, tickKey, }: UseRewardTickerMultiParams): {
    updateAnchor: (key: RewardTickKey, amount: bigint, tsSeconds: bigint) => void;
    clearAnchors: () => void;
    clearAnchor: (key: RewardTickKey) => void;
    getAnchor: (key: RewardTickKey) => RewardTickAnchor | undefined;
};
