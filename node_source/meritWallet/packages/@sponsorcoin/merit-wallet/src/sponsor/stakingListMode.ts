// File: src/sponsor/stakingListMode.ts
//
// 2026-11-13 (owner): the Sponsored Recipient Accounts list is opened from two places on the Rewards tab. The Staked row's Unstake opens it to UNSTAKE; the Sponsor row's Claim opens it to CLAIM (the same rows, the buttons say Claim and
// claim the sponsor rewards instead of unstaking). The opener sets the mode here just before it opens the panel; the list and the page title read it.
import { useSyncExternalStore } from 'react';

export type StakingListMode = { kind: 'unstake' } | { kind: 'claim'; role: 'Sponsor' | 'Recipient' | 'Agent' };

let current: StakingListMode = { kind: 'unstake' };
const listeners = new Set<() => void>();

export function setStakingListMode(mode: StakingListMode): void {
  current = mode;
  listeners.forEach((listener) => listener());
}

export function getStakingListMode(): StakingListMode {
  return current;
}

export function useStakingListMode(): StakingListMode {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getStakingListMode,
    getStakingListMode,
  );
}
