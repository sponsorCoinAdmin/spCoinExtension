export type StakingListMode = {
    kind: 'unstake';
} | {
    kind: 'claim';
    role: 'Sponsor' | 'Recipient' | 'Agent';
    account?: string;
};
export declare function setStakingListMode(mode: StakingListMode): void;
export declare function getStakingListMode(): StakingListMode;
export declare function useStakingListMode(): StakingListMode;
