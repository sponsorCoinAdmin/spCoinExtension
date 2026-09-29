// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/panelTree/useEnforceRadioPanelGroups.ts
//
// 2026-09-18 — moved from the parent app's
// lib/context/exchangeContext/hooks/useEnforceRadioPanelGroups.ts
// (panel-tree runtime migration). No coupling — content unchanged,
// `usePanelTree` now an in-package sibling import.
'use client';

import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';

import { panelStore } from './panelStore';
import { usePanelTree } from './usePanelTree';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';

interface RadioPanelGroup {
  name: string;
  members: readonly SP_COIN_DISPLAY[];
  /**
   * Panel to open when this group drops to ZERO visible members (2026-09-07,
   * on request — "in the WALLET_RADIO_PANELS at least 1 should be selected, if
   * none is selected, open TRADING_STATION"). Optional and per-group: only
   * MAIN_RADIO_OVERLAY_PANELS (the WALLET_RADIO_PANELS node in the debug tree)
   * gets one, wired in RadioOverlayPanelHost.tsx — the other five groups
   * here (ACCOUNT_PANEL_MODES, REWARDS_GROUP_MODES, ...) are documented in
   * panelGroups.ts as "exactly 0 or 1 visible", where 0 is a genuinely
   * valid, intentional state (no account-mode tab selected yet, etc.), not
   * a bug to self-heal. Left undefined there so this invariant only
   * applies where it's actually wanted.
   */
  fallbackPanel?: SP_COIN_DISPLAY;
}

const makeVisibleKey = (members: readonly SP_COIN_DISPLAY[]) =>
  members
    .filter((panel) => panelStore.getPanelSnapshot(panel))
    .map(Number)
    .join(',');

const makeGroupsKey = (groups: readonly RadioPanelGroup[]) =>
  groups.map((group) => `${group.name}:${makeVisibleKey(group.members)}`).join('|');

const parseVisibleKey = (key: string): SP_COIN_DISPLAY[] =>
  key
    ? key
        .split(',')
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value))
        .map((value) => value as SP_COIN_DISPLAY)
    : [];

const normalizeGroups = (groups: readonly RadioPanelGroup[]): RadioPanelGroup[] =>
  groups.map((group) => {
    const seen = new Set<number>();
    return {
      name: group.name,
      members: group.members.filter((panel) => {
        const id = Number(panel);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      }),
      fallbackPanel: group.fallbackPanel,
    };
  });

export function useEnforceRadioPanelGroups(groups: readonly RadioPanelGroup[]) {
  const { setPanelVisible } = usePanelTree();
  const previousVisibleKeysRef = useRef(new Map<string, string>());
  // 2026-09-15, real bug fix (reproduced live via Playwright + targeted
  // tracing, not guessed): the "switch between two ACTIVE_LIST_PANEL_MODES
  // members needs two clicks" bug. Root cause — `setPanelVisible(loser,
  // false, ...)` below is itself async (goes through
  // setExchangeContext/panelStore's own propagation chain), so this effect
  // can re-run (retriggered by an unrelated groupsKey change, or by the
  // WINNER's own write settling) before the loser's `false` write has
  // actually reached panelStore. On that re-run, `visiblePanels` still
  // shows BOTH members — and `previousVisiblePanels` (this ref, keyed off
  // the SAME raw, not-yet-updated panelStore snapshot) already recorded
  // both too, so `newlyVisiblePanels` comes back empty. The old fallback,
  // `visiblePanels[0]`, is just array-DECLARATION order (e.g.
  // ACTIVE_LIST_PANEL_MODES lists REMOTE_ACCOUNT_AGENT_LIST before
  // LOCAL_ACCOUNT_WALLET_LIST) — completely unrelated to which one a user
  // actually just picked, so it silently REVERSES an already-correct
  // decision made moments earlier by this same effect. Confirmed live: a
  // real repro showed run 1 correctly picking the just-opened panel as
  // winner, then run 3 (before the loser's write had propagated) picking
  // the wrong one via this exact fallback path. Fixed by remembering the
  // last real winner per group and reusing it on a stale re-run — only a
  // group with NO winner history yet falls back to array order (a genuine
  // first-ever conflict, not a stale re-run of an already-decided one).
  const lastWinnerRef = useRef(new Map<string, number>());

  const normalizedGroups = useMemo(() => normalizeGroups(groups), [groups]);
  const allMembers = useMemo(() => {
    const seen = new Set<number>();
    const members: SP_COIN_DISPLAY[] = [];

    for (const group of normalizedGroups) {
      for (const panel of group.members) {
        const id = Number(panel);
        if (seen.has(id)) continue;
        seen.add(id);
        members.push(panel);
      }
    }

    return members;
  }, [normalizedGroups]);

  const groupsKey = useSyncExternalStore(
    (callback) => {
      const unsubscribers = allMembers.map((panel) =>
        panelStore.subscribePanel(panel, callback),
      );

      return () => {
        for (const unsubscribe of unsubscribers) unsubscribe();
      };
    },
    () => makeGroupsKey(normalizedGroups),
    () => '',
  );

  useEffect(() => {
    for (const group of normalizedGroups) {
      const visibleKey = makeVisibleKey(group.members);
      const previousVisibleKey = previousVisibleKeysRef.current.get(group.name) ?? '';
      const visiblePanels = parseVisibleKey(visibleKey);
      const previousVisiblePanels = parseVisibleKey(previousVisibleKey);

      previousVisibleKeysRef.current.set(group.name, visibleKey);

      if (visiblePanels.length === 0) {
        if (group.fallbackPanel !== undefined) {
          setPanelVisible(
            group.fallbackPanel,
            true,
            `useEnforceRadioPanelGroups:${group.name}:openFallback:${SP_COIN_DISPLAY[group.fallbackPanel]}`,
          );
        }
        continue;
      }

      if (visiblePanels.length <= 1) {
        // Exactly one (or zero, handled above) visible member is a settled,
        // non-conflicting state — nothing to remember a winner FROM. Clear
        // any stale winner so a future genuine conflict with no fresher
        // signal doesn't reuse a long-stale value.
        lastWinnerRef.current.delete(group.name);
        continue;
      }

      const previousVisible = new Set(previousVisiblePanels.map(Number));
      const newlyVisiblePanels = visiblePanels.filter(
        (panel) => !previousVisible.has(Number(panel)),
      );

      const rememberedWinner = lastWinnerRef.current.get(group.name);
      const rememberedWinnerStillVisible =
        rememberedWinner != null &&
        visiblePanels.some((panel) => Number(panel) === rememberedWinner);

      const winningPanel =
        newlyVisiblePanels[newlyVisiblePanels.length - 1] ??
        (rememberedWinnerStillVisible ? (rememberedWinner as SP_COIN_DISPLAY) : visiblePanels[0]);
      const winningPanelId = Number(winningPanel);

      lastWinnerRef.current.set(group.name, winningPanelId);

      for (const panel of visiblePanels) {
        if (Number(panel) === winningPanelId) continue;

        setPanelVisible(
          panel,
          false,
          `useEnforceRadioPanelGroups:${group.name}:closeOther:${SP_COIN_DISPLAY[winningPanel]}`,
        );
      }
    }
  }, [setPanelVisible, groupsKey, normalizedGroups]);
}
