// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/RewardsPendingByAccountTypePanel.tsx
// Portable placeholder for the real app's MANAGE_PENDING_REWARDS —
// specifically, the Sponsor/Recipient/Agent rows real ManageSponsorshipsPanel.tsx
// (components/views/RadioOverlayPanels) renders in place of the collapsed
// "Pending" row once expanded.
//
// 2026-09-21, Path A — now gated by the REAL `MANAGE_PENDING_REWARDS` (12)
// id, via the real engine's `usePanelVisible` (this package's own
// `PanelGate`), not the synthetic `MERIT_REWARDS_PENDING` id this file
// used to carry. That original "avoid the real id, it has non-Merit
// readers" concern (see git history) was about the wrong risk under this
// architecture: this component's own runtime instance is fully isolated
// from the web app's (separate process, no shared memory — see
// docs/npmMigrationDesign.md's standalone-first decision), so reusing the
// id can't cross-contaminate anything there. `MANAGE_PENDING_REWARDS` is
// also a genuinely purpose-built match — a real, existing child of
// `MANAGE_SPONSORSHIPS_PANEL` in the registry for exactly this
// "pending rewards expanded" concept — not a semantic stretch the way
// reusing an unrelated id would be.
//
// Same "shape only, entirely inert" treatment as every other placeholder
// here: no hover/loading states, no real per-role on-chain estimate/claim
// calls — a plain label/amount/button row, repeated three times, nested
// (rendered) inside ManageSponsorshipsPanel.tsx.
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { PanelGate } from '@sponsorcoin/spcoin-panels';
import { RewardRow, REWARD_ROW_BG_A, REWARD_ROW_BG_B } from '@sponsorcoin/spcoin-panels';
export default function RewardsPendingByAccountTypePanel({ sponsorAmountText = '0', 
// 2026-09-15, on direct request ("there should bo no red N/A. 0 is
// file for the placement") — this is an inert, disconnected placeholder
// (see file header), not a real account read, so there's no real
// "unavailable role" state to warn about here. Defaulting to 'N/A' (and
// flagging `unavailable` off the back of that same literal below) just
// painted these two rows red for no real reason. '0' matches Sponsor's
// own already-correct default.
recipientAmountText = '0', agentAmountText = '0', onClaimSponsor, onClaimRecipient, onClaimAgent, }) {
    return (_jsxs(PanelGate, { panel: SP_COIN_DISPLAY.MANAGE_PENDING_REWARDS, lazyLoad: false, children: [_jsx(RewardRow, { label: "Sponsor", amountText: sponsorAmountText, buttonLabel: "Claim", onClick: onClaimSponsor, indent: true, rowBg: REWARD_ROW_BG_B }), _jsx(RewardRow, { label: "Recipient", amountText: recipientAmountText, buttonLabel: "Claim", onClick: onClaimRecipient, indent: true, rowBg: REWARD_ROW_BG_A }), _jsx(RewardRow, { label: "Agent", amountText: agentAmountText, buttonLabel: "Claim", onClick: onClaimAgent, indent: true, rowBg: REWARD_ROW_BG_B })] }));
}
