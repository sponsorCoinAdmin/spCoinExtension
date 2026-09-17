// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/ManageSponsorshipsPanel.tsx
// Portable placeholder for MANAGE_SPONSORSHIPS_PANEL (2026-09-12, revised
// 2026-09-14 — see docs/design/extensionPlan.md's "Fourth slice" entry
// for the full investigation). The ORIGINAL version of this file (a flat
// "Total Pending Rewards / [amount] / Claim" row + an empty
// GenericListPanel) was found to have no counterpart anywhere in the real
// app: components/views/RadioOverlayPanels/ManageSponsorshipsPanel.tsx
// actually renders a real SpCoins/Amount/Options table (Trading, Staked,
// Pending rows; Pending expands into Sponsor/Recipient/Agent sub-rows;
// a closing Total Coins row) that was simply never ported. This revision
// ports that table's SHAPE only — no hover/loading states, no real
// on-chain estimate/claim calls, no per-row error states — same
// "placeholder, not logic" treatment as every other file here.
//
// Gated by a NEW, genuinely Merit-only panel id ('MERIT_REWARDS_SUMMARY',
// panelState.ts) rather than the real MANAGE_SPONSORSHIPS_PANEL (21) —
// that real id already has confirmed non-Merit readers
// (useHeaderController.ts, useActiveWalletPanelTitle.tsx), so migrating
// it would risk the exact split-brain bug class already caught once for
// MENU_TAB_HEADER_BAR (see extensionPlan.md §7). Zero connection between
// the two — different engine, different id, real app untouched.

'use client';

import React from 'react';
import MeritPanelGate from './MeritPanelGate';
import RewardRow, { REWARD_ROW_BG_A, REWARD_ROW_BG_B, REWARD_ROW_LABEL_WIDTH } from './RewardRow';
import RewardsPendingByAccountTypePanel, {
  type RewardsPendingByAccountTypePanelProps,
} from './RewardsPendingByAccountTypePanel';
import { PACKAGE_BUILD } from './packageBuildTag';
import TabBodyMarker from './TabBodyMarker';

export interface ManageSponsorshipsPanelProps {
  tradingAmountText?: string;
  stakedAmountText?: string;
  pendingAmountText?: string;
  totalCoinsText?: string;
  onStake?: () => void;
  onUnstake?: () => void;
  /** Toggles the real app's own MANAGE_PENDING_REWARDS-equivalent
   *  (RewardsPendingByAccountTypePanel's own gate) — see
   *  MeritWallet.tsx's own onTogglePendingRewards for where this is
   *  actually wired to meritPanelState.setVisible. */
  onTogglePending?: () => void;
  onClaimAll?: () => void;
  /** Forwarded straight through to RewardsPendingByAccountTypePanel. */
  pendingByAccountType?: RewardsPendingByAccountTypePanelProps;
}

export default function ManageSponsorshipsPanel({
  tradingAmountText = '0',
  stakedAmountText = '0',
  pendingAmountText = '0',
  totalCoinsText = '0',
  onStake,
  onUnstake,
  onTogglePending,
  onClaimAll,
  pendingByAccountType,
}: ManageSponsorshipsPanelProps) {
  return (
    <MeritPanelGate panel="MERIT_REWARDS_SUMMARY" lazyLoad={false}>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
        <TabBodyMarker path="ManageSponsorshipsPanel.tsx" build={PACKAGE_BUILD} />

        {/* 2026-09-15, on request ("rounded edge Container wit alternating
            row bg colors rounded edges and green buttons") — matches the
            real table's own outer treatment (ManageSponsorshipsPanel.tsx's
            `rounded-xl border border-black` wrapper): rounded corners +
            overflow:hidden here so every child row (including the flat
            header/Total Coins rectangles below) gets clipped to the same
            rounded shape, rather than each row needing its own partial
            radius. Border is a visible slate tone, NOT '#000' — a pure
            black 1px border is imperceptible against sidepanel.html's own
            near-black page background (#11162a), which is very likely why
            the rounding read as "not there" even once the container was
            actually in place; the real app gets away with `border-black`
            because it never sits directly on a near-black page.
            2026-09-15, on request ("left right and bottom buffers") — the
            container sat flush against its own parent's edges on every
            side; margin gives it real breathing room left/right/bottom
            (top stays 0 — the tab bar above already provides its own
            spacing). */}
        <div style={{ borderRadius: 12, border: '1px solid #334155', overflow: 'hidden', margin: '0 8px 8px 8px' }}>
          {/* Header row — matches the real table's SpCoins/Amount/Options
              columns exactly (components/views/RadioOverlayPanels/
              ManageSponsorshipsPanel.tsx's own <thead>: msTableTw.theadRow
              is `bg-[#2b2b2b] border-b border-black` — a distinct grey,
              not the dark navy this row used before, which barely
              contrasted against sidepanel.html's own near-black page
              background and was also why the outer rounded container
              below was hard to make out — with no header contrast, there
              was nothing visible for the rounded top corners to clip. */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '5px 10px',
              background: '#2b2b2b',
              borderBottom: '1px solid #000000',
              gap: 6,
            }}
          >
            {/* 2026-09-15, on request ("Amount should be left justified") —
                none of these had an explicit textAlign, so they inherited
                sidepanel.html's own `body { text-align: center }` instead of
                rendering left-justified like every other label/value in this
                package. Options stays centered on purpose — that column
                holds a button, not a label. */}
            <div style={{ flex: `0 0 ${REWARD_ROW_LABEL_WIDTH}px`, textAlign: 'left', fontSize: 9, fontWeight: 700, color: '#94a3b8' }}>SpCoins</div>
            <div style={{ flex: 1, textAlign: 'left', fontSize: 9, fontWeight: 700, color: '#94a3b8' }}>Amount</div>
            <div style={{ flexShrink: 0, minWidth: 40, textAlign: 'center', fontSize: 9, fontWeight: 700, color: '#94a3b8' }}>
              Options
            </div>
          </div>

          {/* Zebra striping (rowBg, alternating REWARD_ROW_BG_A/B) matches
              the real table's own rowA/rowB pattern exactly — see
              RewardRow.tsx's own doc comment on those two constants. Fixed
              top-to-bottom order here since this panel's row sequence is
              static (unlike the real app's collapsible Pending group). */}
          <RewardRow label="Trading" amountText={tradingAmountText} buttonLabel="Stake" onClick={onStake} rowBg={REWARD_ROW_BG_A} />
          <RewardRow label="Staked" amountText={stakedAmountText} buttonLabel="Unstake" onClick={onUnstake} rowBg={REWARD_ROW_BG_B} />

          {/* Pending — collapses to one summary row, or expands into
              RewardsPendingByAccountTypePanel's own three rows. Real click
              behavior (left-click estimates, right-click toggles) isn't
              replicated here — a single click just toggles, matching this
              file's own "shape only" scope. */}
          <RewardRow label="Pending" amountText={pendingAmountText} buttonLabel="Claim" onClick={onClaimAll ?? onTogglePending} rowBg={REWARD_ROW_BG_A} />
          <RewardsPendingByAccountTypePanel {...pendingByAccountType} />

          {/* Total Coins — spans the Amount+Options columns, matching the
              real table's own colSpan={2} row. */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '5px 10px',
              borderTop: '1px solid #1e293b',
              gap: 6,
              background: REWARD_ROW_BG_A,
            }}
          >
            <div style={{ flex: `0 0 ${REWARD_ROW_LABEL_WIDTH}px`, textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#ffffff' }}>Total Coins</div>
            <div style={{ flex: 1, textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#ffffff' }}>{totalCoinsText}</div>
          </div>
        </div>
      </div>
    </MeritPanelGate>
  );
}
