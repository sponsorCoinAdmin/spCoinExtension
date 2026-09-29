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
export function useRewardTicker({ autoRefresh, isActive, decimals, tickKey = 'Total', }) {
    const anchorRef = useRef(undefined);
    const [, setTickCounter] = useState(0);
    const updateAnchor = useCallback((amount, tsSeconds) => {
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
    }, [tickKey]);
    const clearAnchors = useCallback(() => {
        anchorRef.current = undefined;
    }, []);
    const displayAmount = (() => {
        const anchor = anchorRef.current;
        if (!anchor)
            return formatAccountRecordAmount(0n, decimals);
        const nowMs = Date.now();
        const elapsedSeconds = nowMs > anchor.capturedAtWallClockMs
            ? BigInt(Math.floor((nowMs - anchor.capturedAtWallClockMs) / 1000))
            : 0n;
        const live = anchor.amount + anchor.ratePerSecond * elapsedSeconds;
        return formatAccountRecordAmount(live.toString(), decimals);
    })();
    useEffect(() => {
        if (!autoRefresh || !isActive)
            return;
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
export function useRewardTickerMulti({ autoRefresh, isActive, decimals, onTick, hasConfirmedRate, tickKey = 'all', }) {
    const anchorsRef = useRef({});
    const onTickRef = useRef(onTick);
    useEffect(() => {
        onTickRef.current = onTick;
    }, [onTick]);
    const updateAnchor = useCallback((key, amount, tsSeconds) => {
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
    }, []);
    const clearAnchor = useCallback((key) => {
        anchorsRef.current[key] = undefined;
    }, []);
    const clearAnchors = useCallback(() => {
        anchorsRef.current = {};
    }, []);
    const getAnchor = useCallback((key) => {
        return anchorsRef.current[key];
    }, []);
    useEffect(() => {
        if (!autoRefresh || !isActive)
            return;
        if (hasConfirmedRate === false)
            return;
        const id = setInterval(() => {
            const nowMs = Date.now();
            const liveAmounts = {};
            for (const key of Object.keys(anchorsRef.current)) {
                const anchor = anchorsRef.current[key];
                if (!anchor)
                    continue;
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
