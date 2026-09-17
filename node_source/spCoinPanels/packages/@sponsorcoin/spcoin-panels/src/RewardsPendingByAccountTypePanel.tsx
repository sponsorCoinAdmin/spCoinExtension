// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/RewardsPendingByAccountTypePanel.tsx
// Portable placeholder for the real app's MANAGE_PENDING_REWARDS —
// specifically, the Sponsor/Recipient/Agent rows real ManageSponsorshipsPanel.tsx
// (components/views/RadioOverlayPanels) renders in place of the collapsed
// "Pending" row once expanded. See docs/design/extensionPlan.md's "Fourth
// slice" entry for why this is a NEW, Merit-only panel id
// ('MERIT_REWARDS_PENDING', panelState.ts) rather than the real
// MANAGE_PENDING_REWARDS (12) — that real id already has confirmed
// non-Merit readers, so it stays exactly where it is, untouched.
//
// Same "shape only, entirely inert" treatment as every other placeholder
// here: no hover/loading states, no real per-role on-chain estimate/claim
// calls — a plain label/amount/button row, repeated three times, nested
// (rendered) inside ManageSponsorshipsPanel.tsx.

'use client';

import React from 'react';
import MeritPanelGate from './MeritPanelGate';
import RewardRow, { REWARD_ROW_BG_A, REWARD_ROW_BG_B } from './RewardRow';

export interface RewardsPendingByAccountTypePanelProps {
  sponsorAmountText?: string;
  recipientAmountText?: string;
  agentAmountText?: string;
  onClaimSponsor?: () => void;
  onClaimRecipient?: () => void;
  onClaimAgent?: () => void;
}

export default function RewardsPendingByAccountTypePanel({
  sponsorAmountText = '0',
  // 2026-09-15, on direct request ("there should bo no red N/A. 0 is
  // file for the placement") — this is an inert, disconnected placeholder
  // (see file header), not a real account read, so there's no real
  // "unavailable role" state to warn about here. Defaulting to 'N/A' (and
  // flagging `unavailable` off the back of that same literal below) just
  // painted these two rows red for no real reason. '0' matches Sponsor's
  // own already-correct default.
  recipientAmountText = '0',
  agentAmountText = '0',
  onClaimSponsor,
  onClaimRecipient,
  onClaimAgent,
}: RewardsPendingByAccountTypePanelProps) {
  return (
    <MeritPanelGate panel="MERIT_REWARDS_PENDING" lazyLoad={false}>
      {/* rowBg continues the A/B/A/B zebra sequence from ManageSponsorshipsPanel.tsx's
          preceding Trading(A)/Staked(B)/Pending(A) rows — always rendered
          right after Pending, so Sponsor picks up at B. */}
      <RewardRow label="Sponsor" amountText={sponsorAmountText} buttonLabel="Claim" onClick={onClaimSponsor} indent rowBg={REWARD_ROW_BG_B} />
      <RewardRow label="Recipient" amountText={recipientAmountText} buttonLabel="Claim" onClick={onClaimRecipient} indent rowBg={REWARD_ROW_BG_A} />
      <RewardRow label="Agent" amountText={agentAmountText} buttonLabel="Claim" onClick={onClaimAgent} indent rowBg={REWARD_ROW_BG_B} />
    </MeritPanelGate>
  );
}
