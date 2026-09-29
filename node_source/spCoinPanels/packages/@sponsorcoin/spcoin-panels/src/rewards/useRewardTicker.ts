// File: src/rewards/useRewardTicker.ts
// Portable per-second accrual ticker hook (2026-09-27, Phase 4).
//
// Extracts the ticker math from the web app's ManageSponsorshipsPanel.tsx
// (lines 429-471: anchor setup; lines 1069-1130: the setInterval effect).
// The original lived inline in the 1903-line web component, tightly coupled
// to its data-fetch effects — this hook decouples the TICKING math from data
// fetching, making it reusable by both the web app wrapper and the
// extension's shell.
//
// Why this is portable (no Phase B.2 dependency):
// - Uses only native setInterval + Date.now() for time math (wall-clock vs
//   wall-clock, never comparing wall to chain time — that mismatch was the
//   original overstatement bug, 2026-09-08, now baked into the anchor model).
// - Uses formatAccountRecordAmount (already in @sponsorcoin/spcoin-panels).
// - Accepts autoRefresh as a boolean prop (no autoRefreshStore dependency).
// - The anchor data (amount, tsSeconds, ratePerSecond, capturedAtWallClockMs)
//   comes from whoever calls updateAnchor — that's the data-fetch layer,
//   which stays in the web app wrapper (Phase B.2). The hook itself just
//   interpolates.
//
// The extension can call updateAnchor with 0n/0n when it has no real data yet
// (inert state); the ticker will just render zeros until real anchors arrive.

import { useEffect, useRef, useState, useCallback } from 'react';
import { formatAccountRecordAmount } from './rewardResultParsers';
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

export function useRewardTicker({
  autoRefresh,
  isActive,
  decimals,
  tickKey = 'Total',
}: UseRewardTickerParams): UseRewardTickerResult {
  const anchorRef = useRef<RewardTickAnchor | undefined>(undefined);
  const [, setTickCounter] = useState(0);

  const updateAnchor = useCallback(
    (amount: bigint, tsSeconds: bigint) => {
      const capturedAtWallClockMs = Date.now();
      const prior = anchorRef.current;
      let ratePerSecond = 0n;
      if (prior && tsSeconds > prior.tsSeconds) {
        const elapsed = tsSeconds - prior.tsSeconds;
        const delta = amount - prior.amount;
        ratePerSecond = delta > 0n ? delta / elapsed : 0n;
      }
      anchorRef.current = {
        amount,
        tsSeconds,
        ratePerSecond,
        capturedAtWallClockMs,
      };
    },
    [tickKey],
  );

  const clearAnchors = useCallback(() => {
    anchorRef.current = undefined;
  }, []);

  const displayAmount = (() => {
    const anchor = anchorRef.current;
    if (!anchor) return formatAccountRecordAmount(0n, decimals);
    const nowMs = Date.now();
    const elapsedSeconds = nowMs > anchor.capturedAtWallClockMs
      ? BigInt(Math.floor((nowMs - anchor.capturedAtWallClockMs) / 1000))
      : 0n;
    const live = anchor.amount + anchor.ratePerSecond * elapsedSeconds;
    return formatAccountRecordAmount(live.toString(), decimals);
  })();

  // Phase 2 — the per-second tick. Reads the anchor and recomputes the
  // display amount every second. Uses setTickCounter (a throwaway state
  // bump) to force a re-render — the displayAmount above is recomputed
  // on every render from the live ref, so this just triggers the interval.
  useEffect(() => {
    if (!autoRefresh || !isActive) return;
    const id = setInterval(() => {
      setTickCounter((n) => n + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [autoRefresh, isActive, tickKey]);

  return {
    displayAmount,
    updateAnchor,
    clearAnchors,
  };
}

// ─── Multi-key variant (2026-09-27) ──────────────────────────────────────────
// Used by web app's ManageSponsorshipsPanel.tsx which tracks Total + each
// RewardRoleName (Sponsor/Recipient/Agent) as separate anchors but drives them
// all from a single setInterval. Matches the original inline
// rewardTickAnchorsRef pattern (lines 429-471, 1085-1126).
//
// The onTick callback fires every second (when autoRefresh+isActive) with a
// snapshot of live-formatted amounts for every key that currently has an
// anchor. The caller pushes these into its own React state setters
// (setTotalReward, setRoleRewards) — the hook stays framework-agnostic, only
// owning the anchor refs + setInterval.

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
  tickKey?: string; // namespace for hook identity (default 'all')
}

export function useRewardTickerMulti({
  autoRefresh,
  isActive,
   decimals,
   onTick,
   hasConfirmedRate,
   tickKey = 'all',
}: UseRewardTickerMultiParams): {
  updateAnchor: (key: RewardTickKey, amount: bigint, tsSeconds: bigint) => void;
  clearAnchors: () => void;
  clearAnchor: (key: RewardTickKey) => void;
  getAnchor: (key: RewardTickKey) => RewardTickAnchor | undefined;
} {
  const anchorsRef = useRef<Partial<Record<RewardTickKey, RewardTickAnchor>>>({});
  const onTickRef = useRef(onTick);
  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  const updateAnchor = useCallback(
    (key: RewardTickKey, amount: bigint, tsSeconds: bigint) => {
      if (tsSeconds <= 0n) {
        anchorsRef.current[key] = undefined;
        return;
      }
      const capturedAtWallClockMs = Date.now();
      const prior = anchorsRef.current[key];
      let ratePerSecond = 0n;
      if (prior && tsSeconds > prior.tsSeconds) {
        const elapsed = tsSeconds - prior.tsSeconds;
        const delta = amount - prior.amount;
        ratePerSecond = delta > 0n ? delta / elapsed : 0n;
      }
      anchorsRef.current[key] = {
        amount,
        tsSeconds,
        ratePerSecond,
        capturedAtWallClockMs,
      };
    },
    [],
  );

  const clearAnchor = useCallback((key: RewardTickKey) => {
    anchorsRef.current[key] = undefined;
  }, []);

  const clearAnchors = useCallback(() => {
    anchorsRef.current = {};
  }, []);

  const getAnchor = useCallback((key: RewardTickKey): RewardTickAnchor | undefined => {
    return anchorsRef.current[key];
  }, []);

  useEffect(() => {
    if (!autoRefresh || !isActive) return;
    if (hasConfirmedRate === false) return;
    const id = setInterval(() => {
      const nowMs = Date.now();
      const liveAmounts: Partial<Record<RewardTickKey, string>> = {};
      for (const key of Object.keys(anchorsRef.current) as RewardTickKey[]) {
        const anchor = anchorsRef.current[key];
        if (!anchor) continue;
        const elapsedSeconds = nowMs > anchor.capturedAtWallClockMs
          ? BigInt(Math.floor((nowMs - anchor.capturedAtWallClockMs) / 1000))
          : 0n;
        const live = anchor.amount + anchor.ratePerSecond * elapsedSeconds;
        liveAmounts[key] = formatAccountRecordAmount(live.toString(), decimals);
      }
      onTickRef.current(liveAmounts);
    }, 1000);
    return () => clearInterval(id);
  }, [autoRefresh, isActive, decimals, hasConfirmedRate, tickKey]);

  return { updateAnchor, clearAnchors, clearAnchor, getAnchor };
}
