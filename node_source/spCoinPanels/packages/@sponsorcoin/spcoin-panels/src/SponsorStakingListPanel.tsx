// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/SponsorStakingListPanel.tsx
// Portable shell for SPONSOR_STAKING_LIST (98) — promoted from the web app's
// components/views/RadioOverlayPanels/SponsorStakingListPanel.tsx (1880 ln).
// Non-portable pieces — AccountSelectDropDown (web-app-only, wraps
// ExchangeContext), StakeConfirmPopup (web-only, uses wagmi/viem +
// swap.tsx execution), next/image, ExchangeContextState, useActiveSpCoinAddress,
// useErrorMessage, useCacheRefreshHandler, debugLog, parseUnits/ethers — all
// stay in the web-app wrapper and are supplied here as opaque slots/callbacks,
// same "opaque-slot split" shape as AccountListRewardsPanel / StakingControllerPanel
// this session.
//
// What moved here: the entire nested table layout (Recipient -> Rate -> Agent ->
// AgentRate), the chevron open/close state machine, all stake-weighted share
// percentage computations (BigInt math throughout), the Direct/No-Agent
// remainder math, the unstake-target keying, the total-row aggregation,
// PanelGate-visibility (via usePanelVisible from @sponsorcoin/spcoin-exchange-engine),
// and the header/footer rows. Inline styles only (no Tailwind — the extension
// has no Tailwind pipeline), pixel-identical to the real web app's structure.
// The panel renders the StakeConfirmPopup area via a `confirmPopupContent` slot
// so the wrapper can inject its own web-only popup; if omitted, unstake buttons
// are omitted entirely (extension stays inert).

'use client';

import React, { useCallback, useState } from 'react';
import { AlertTriangle, ChevronDown } from 'lucide-react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { type spCoinAccount } from '@sponsorcoin/spcoin-common/context';
import { PACKAGE_BUILD } from './packageBuildTag';
import TabBodyMarker from './TabBodyMarker';
import PanelGate from './PanelGate';
import ScrollTablePanel from './ScrollTablePanel';

// ── Types ─────────────────────────────────────────────────────────────────

export interface AgentRateStakeInfo {
  agentRateKey: string;
  stakedSPCoins: string;
}

export interface AgentStakeInfo {
  account: spCoinAccount;
  stakedSPCoins: string;
  agentRates: AgentRateStakeInfo[];
  failed?: boolean;
}

export interface RecipientStakeInfo {
  rateKey: string;
  stakedSPCoins: string;
  agentAccounts: AgentStakeInfo[];
  agentKeysFailed?: boolean;
}

export interface UnstakeTarget {
  recipient: spCoinAccount;
  amount: string;
  rateKey?: string;
  agent?: spCoinAccount;
  agentRateKey?: string;
}

export type SponsorStakingAccountCellSlot = React.FC<{
  account: spCoinAccount;
  mode: typeof SP_COIN_DISPLAY.RECIPIENT_ACCOUNT | typeof SP_COIN_DISPLAY.AGENT_ACCOUNT;
  label: string;
  addrPrePostSize?: number;
  addressSizeClassName?: string;
  onAddressClick?: (e: React.MouseEvent) => void;
}>;

export interface SponsorStakingListPanelProps {
  recipients: spCoinAccount[];
  stakeInfoByAddress: Record<string, RecipientStakeInfo[] | undefined>;
  decimals: number;
  loading: boolean;
  error?: string;
  /** Which row is currently mid-unstake (drives "Unstaking…" button state). Managed by the wrapper. */
  activeUnstakeKey?: string | null;
  /** Opaque slot: recipient/agent account cell (web app: AccountSelectDropDown wrapper). Defaults to plain <img>. */
  accountCellSlot?: SponsorStakingAccountCellSlot;
  /** Opaque slot: avatar-only rendering (web app: AccountAvatar). Defaults to plain <img>. */
  avatarSlot?: (account: spCoinAccount) => React.ReactNode;
  /** Opaque slot for loading indicator (web app: <LoadingText/>). */
  loadingContent?: React.ReactNode;
  /** Opaque slot: the unstake confirmation popup (web app: <StakeConfirmPopup/>). */
  confirmPopupContent?: (props: {
    isOpen: boolean;
    target: UnstakeTarget | null;
    totalAmount: string | undefined;
    onConfirm: (amount?: string) => void;
    onCancel: () => void;
  }) => React.ReactNode;
  /** Called when the popup's confirm button is clicked; the wrapper runs the actual unstakeSpCoin call. */
  onConfirmUnstake?: (target: UnstakeTarget, amount?: string) => Promise<void> | void;
  /** Called when the popup is cancelled. */
  onCancelUnstake?: () => void;
  panelId?: SP_COIN_DISPLAY;
}

// ── Pure formatting helpers (mirrors sponsorStakingListCache.ts) ──────────

export function formatTokenAmount(rawValue: unknown, decimals: number): string {
  const normalized = String(rawValue ?? '0').replace(/,/g, '').trim() || '0';
  if (!/^-?\d+$/.test(normalized)) return '0';
  const negative = normalized.startsWith('-');
  const digits = negative ? normalized.slice(1) : normalized;
  const padded = digits.padStart(decimals + 1, '0');
  const whole = decimals > 0 ? padded.slice(0, padded.length - decimals) : padded;
  const fraction = decimals > 0 ? padded.slice(padded.length - decimals).replace(/0+$/, '') : '';
  const formatted = fraction ? `${whole}.${fraction}` : whole || '0';
  return negative ? `-${formatted}` : formatted;
}

export function formatTokenAmountCapped(rawValue: unknown, decimals: number, maxChars = 12): string {
  const full = formatTokenAmount(rawValue, decimals);
  if (full.length <= maxChars) return full;
  const negative = full.startsWith('-');
  const unsigned = negative ? full.slice(1) : full;
  const signLen = negative ? 1 : 0;
  const dotIndex = unsigned.indexOf('.');
  if (dotIndex === -1) return full;
  const whole = unsigned.slice(0, dotIndex);
  const fraction = unsigned.slice(dotIndex + 1);
  const decimalBudget = maxChars - signLen - whole.length - 1;
  if (decimalBudget <= 0) return `${negative ? '-' : ''}${whole}`;
  const truncatedFraction = fraction.slice(0, decimalBudget).replace(/0+$/, '');
  return truncatedFraction
    ? `${negative ? '-' : ''}${whole}.${truncatedFraction}`
    : `${negative ? '-' : ''}${whole}`;
}

export function sumStakedRaw(entries: RecipientStakeInfo[]): bigint {
  return entries.reduce((sum, info) => {
    const normalized = String(info.stakedSPCoins ?? '0').replace(/,/g, '').trim() || '0';
    if (!/^-?\d+$/.test(normalized)) return sum;
    try {
      return sum + BigInt(normalized);
    } catch {
      return sum;
    }
  }, 0n);
}

export function sumAgentStakedRaw(agentAccounts: AgentStakeInfo[]): bigint {
  return agentAccounts.reduce((sum, agent) => {
    const normalized = String(agent.stakedSPCoins ?? '0').replace(/,/g, '').trim() || '0';
    if (!/^-?\d+$/.test(normalized)) return sum;
    try {
      return sum + BigInt(normalized);
    } catch {
      return sum;
    }
  }, 0n);
}

function isNonZeroRaw(value: string | undefined): boolean {
  const normalized = String(value ?? '0').replace(/,/g, '').trim() || '0';
  if (!/^-?\d+$/.test(normalized)) return false;
  try {
    return BigInt(normalized) !== 0n;
  } catch {
    return false;
  }
}

function toRawBigInt(value: string | undefined): bigint {
  const normalized = String(value ?? '0').replace(/,/g, '').trim() || '0';
  if (!/^-?\d+$/.test(normalized)) return 0n;
  try {
    return BigInt(normalized);
  } catch {
    return 0n;
  }
}

function visibleAgentAccounts(agentAccounts: AgentStakeInfo[]): AgentStakeInfo[] {
  return agentAccounts.filter((agent) => agent.failed || isNonZeroRaw(agent.stakedSPCoins));
}

function visibleAgentRates(agentRates: AgentRateStakeInfo[]): AgentRateStakeInfo[] {
  return agentRates.filter((rate) => isNonZeroRaw(rate.stakedSPCoins));
}

function computeAgentSplit(
  bucketRecipientRate: number,
  agentRateKey: number,
): { recipientSharePct: number; agentSharePct: number } {
  if (!Number.isFinite(bucketRecipientRate) || !Number.isFinite(agentRateKey)) {
    return { recipientSharePct: bucketRecipientRate || 0, agentSharePct: 0 };
  }
  const agentSharePct = Math.round(((bucketRecipientRate * agentRateKey) / 1000) * 100) / 100;
  const recipientSharePct = Math.round((bucketRecipientRate - agentSharePct) * 100) / 100;
  return { recipientSharePct, agentSharePct };
}

function unstakeTargetKey(recipientAddr: string, rateKey?: string, agentAddr?: string, agentRateKey?: string): string {
  return [
    recipientAddr.trim().toLowerCase(),
    rateKey ?? '',
    (agentAddr ?? '').trim().toLowerCase(),
    agentRateKey ?? '',
  ].join('|');
}

function computeDirectStakedRaw(bucketTotal: string, agentAccounts: AgentStakeInfo[]): bigint {
  if (agentAccounts.some((agent) => agent.failed)) return 0n;
  const normalized = String(bucketTotal ?? '0').replace(/,/g, '').trim() || '0';
  if (!/^-?\d+$/.test(normalized)) return 0n;
  try {
    const direct = BigInt(normalized) - sumAgentStakedRaw(agentAccounts);
    return direct > 0n ? direct : 0n;
  } catch {
    return 0n;
  }
}

function computeRecipientWeightedSharePct(rates: RecipientStakeInfo[]): number {
  let weightedBpsSum = 0n;
  let totalWeight = 0n;

  for (const rate of rates) {
    const bucketRate = Number(rate.rateKey);
    if (!Number.isFinite(bucketRate)) continue;

    const directAmount = computeDirectStakedRaw(rate.stakedSPCoins, rate.agentAccounts);
    if (directAmount > 0n) {
      weightedBpsSum += BigInt(Math.round(bucketRate * 100)) * directAmount;
      totalWeight += directAmount;
    }

    for (const agent of rate.agentAccounts) {
      if (agent.failed) continue;
      for (const agentRate of agent.agentRates) {
        const amount = toRawBigInt(agentRate.stakedSPCoins);
        if (amount <= 0n) continue;
        const { recipientSharePct } = computeAgentSplit(bucketRate, Number(agentRate.agentRateKey));
        weightedBpsSum += BigInt(Math.round(recipientSharePct * 100)) * amount;
        totalWeight += amount;
      }
    }
  }

  if (totalWeight === 0n) return 0;
  return Number(weightedBpsSum / totalWeight) / 100;
}

function computeBucketDirectSharePct(bucketRate: number, agentAccounts: AgentStakeInfo[]): number {
  let weightedBpsSum = 0n;
  let totalWeight = 0n;

  for (const agent of agentAccounts) {
    if (agent.failed) continue;
    for (const agentRate of agent.agentRates) {
      const amount = toRawBigInt(agentRate.stakedSPCoins);
      if (amount <= 0n) continue;
      const { agentSharePct } = computeAgentSplit(bucketRate, Number(agentRate.agentRateKey));
      weightedBpsSum += BigInt(Math.round(agentSharePct * 100)) * amount;
      totalWeight += amount;
    }
  }

  if (totalWeight === 0n) return bucketRate;
  const agentWeightedSharePct = Number(weightedBpsSum / totalWeight) / 100;
  return Math.round((bucketRate - agentWeightedSharePct) * 100) / 100;
}

// ── Layout constants ──────────────────────────────────────────────────────

const ROW_BASE_PADDING_PX = 12;
const ROW_GAP_PX = 4;
const ROW_LEADING_SLOT_PX = 40;
const ROW_LEVEL_STEP_PX = 24;

function iconStartPx(rowIndentPx: number): number {
  return rowIndentPx + ROW_LEADING_SLOT_PX + ROW_GAP_PX;
}

const RECIPIENT_ICON_START_PX = iconStartPx(ROW_BASE_PADDING_PX);
const RATE_ROW_INDENT_PX = RECIPIENT_ICON_START_PX;
const AGENT_ROW_INDENT_PX = RATE_ROW_INDENT_PX + ROW_LEVEL_STEP_PX;
const AGENT_ICON_START_PX = iconStartPx(AGENT_ROW_INDENT_PX);
const AGENT_RATE_ROW_INDENT_PX = AGENT_ICON_START_PX;
const SINGLE_RATE_AGENT_ROW_INDENT_PX = RATE_ROW_INDENT_PX;
const SINGLE_RATE_AGENT_RATE_ROW_INDENT_PX = iconStartPx(SINGLE_RATE_AGENT_ROW_INDENT_PX);

// Expanded per-rate sub-rows alternate shade (not hue) of whichever zebra
// color their own parent recipient row used.
const EXPANDED_ROW_SHADES_BY_PARENT: Record<'rowA' | 'rowB', readonly [string, string]> = {
  rowA: ['rgba(56,78,126,0.18)', 'rgba(56,78,126,0.35)'],
  rowB: ['rgba(156,163,175,0.12)', 'rgba(156,163,175,0.25)'],
};

const AGENT_ROW_SHADES_BY_PARENT: Record<'rowA' | 'rowB', readonly [string, string]> = {
  rowA: ['rgba(56,78,126,0.10)', 'rgba(56,78,126,0.22)'],
  rowB: ['rgba(156,163,175,0.06)', 'rgba(156,163,175,0.16)'],
};

const AGENT_RATE_ROW_SHADES_BY_PARENT: Record<'rowA' | 'rowB', readonly [string, string]> = {
  rowA: ['rgba(56,78,126,0.06)', 'rgba(56,78,126,0.14)'],
  rowB: ['rgba(156,163,175,0.03)', 'rgba(156,163,175,0.10)'],
};

const ROW_BG_BY_PARENT: Record<'rowA' | 'rowB', string> = {
  rowA: 'rgba(56,78,126,0.35)',
  rowB: 'rgba(156,163,175,0.25)',
};

const ROW_LABEL_TEXT_STYLE: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: '#ffffff',
};

// Button styles (inline, no Tailwind)
const btnGreenBase: React.CSSProperties = {
  flexShrink: 0,
  minWidth: 76,
  borderRadius: 6,
  border: 'none',
  fontSize: 9,
  fontWeight: 600,
  paddingTop: 3,
  paddingBottom: 3,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#16a34a',
  color: '#ffffff',
  cursor: 'pointer',
};

const btnGreenDisabled: React.CSSProperties = {
  ...btnGreenBase,
  opacity: 0.4,
  cursor: 'not-allowed',
};

const btnRedBusy: React.CSSProperties = {
  flexShrink: 0,
  minWidth: 76,
  borderRadius: 6,
  border: 'none',
  fontSize: 9,
  fontWeight: 600,
  paddingTop: 3,
  paddingBottom: 3,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#dc2626',
  color: '#ffffff',
  cursor: 'not-allowed',
};

const CELL_SIZE_PX = 38;

// ── Default cell implementations (no web-only deps) ──────────────────────

function DefaultAccountCellImpl({
  account,
}: {
  account: spCoinAccount;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
      <button
        type="button"
        style={{ background: 'transparent', padding: 0, margin: 0, cursor: 'pointer' }}
        aria-label={`Open ${account?.name ?? 'Wallet'} details`}
      >
        <img
          src={(account as any)?.logoURL || '/assets/miscellaneous/placeholder.png'}
          alt={`${account?.name ?? 'Wallet'} logo`}
          width={CELL_SIZE_PX}
          height={CELL_SIZE_PX}
          style={{ width: CELL_SIZE_PX, height: CELL_SIZE_PX, objectFit: 'contain', background: 'transparent' }}
        />
      </button>
      <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
        <div style={{ width: '100%', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', color: '#5981F3' }}>
          {account?.name ?? 'Unknown'}
        </div>
        <div style={{ width: '100%', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', color: '#5981F3' }}>
          {(account as any)?.symbol ?? ''}
        </div>
      </div>
    </div>
  );
}

function DefaultAvatarImpl({ account }: { account: spCoinAccount }) {
  return (
    <img
      src={(account as any)?.logoURL || '/assets/miscellaneous/placeholder.png'}
      alt={`${account?.name ?? 'Wallet'} logo`}
      width={24}
      height={24}
      style={{ width: 24, height: 24, objectFit: 'contain', background: 'transparent', borderRadius: 4 }}
    />
  );
}

// ── Nested rendering components ────────────────────────────────────────────

function DirectNoAgentRowFields({
  recipient,
  amountRaw,
  decimals,
  onUnstake,
  unstakeAriaLabel,
  unstakeTitle,
  isThisRowUnstaking,
  isAnyUnstaking,
  avatarSlot,
}: {
  recipient?: spCoinAccount;
  amountRaw: string;
  decimals: number;
  onUnstake: () => void;
  unstakeAriaLabel: string;
  unstakeTitle: string;
  isThisRowUnstaking: boolean;
  isAnyUnstaking: boolean;
  avatarSlot?: (account: spCoinAccount) => React.ReactNode;
}) {
  return (
    <>
      {avatarSlot ? avatarSlot(recipient!) : <DefaultAvatarImpl account={recipient!} />}
      <span style={{ minWidth: 0, flex: 1, fontSize: 13, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>No Agent</span>
      <span style={{ width: 96, flexShrink: 0, textAlign: 'right', fontSize: 13, color: '#94a3b8', whiteSpace: 'nowrap' }}>
        {formatTokenAmountCapped(amountRaw, decimals)}
      </span>
      <div style={{ width: 96, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
        <button
          type="button"
          disabled={isAnyUnstaking}
          style={isThisRowUnstaking ? btnRedBusy : isAnyUnstaking ? btnGreenDisabled : btnGreenBase}
          aria-label={unstakeAriaLabel}
          title={isThisRowUnstaking ? 'Unstaking…' : unstakeTitle}
          onClick={onUnstake}
        >
          {isThisRowUnstaking ? 'Unstaking' : 'Unstake'}
        </button>
      </div>
    </>
  );
}

function AgentRateIndicator({
  agentAccounts,
  agentKeysFailed,
  expanded,
  onToggle,
}: {
  agentAccounts: AgentStakeInfo[];
  agentKeysFailed?: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  if (agentKeysFailed) {
    return (
      <span title="Agent list failed to load — refresh to retry" style={{ display: 'inline-flex', flexShrink: 0 }}>
        <AlertTriangle size={14} style={{ flexShrink: 0, color: '#fbbf24' }} aria-label="Agent list failed to load — refresh to retry" />
      </span>
    );
  }
  if (agentAccounts.length === 0) {
    return <span aria-hidden style={{ display: 'inline-flex', flexShrink: 0, width: 14 }} />;
  }
  return (
    <button
      type="button"
      style={{ ...ROW_LABEL_TEXT_STYLE, display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}
      onClick={onToggle}
      aria-label={expanded ? 'Collapse agents' : 'Expand agents'}
      title={expanded ? 'Collapse agents' : `${agentAccounts.length} agent${agentAccounts.length === 1 ? '' : 's'} — click to expand`}
    >
      <ChevronDown size={14} style={{ flexShrink: 0, transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none' }} />
    </button>
  );
}

function AgentOwnRateIndicator({
  agentRates,
  bucketRecipientRate,
  expanded,
  onToggle,
  maxRateTextChars,
}: {
  agentRates: AgentRateStakeInfo[];
  bucketRecipientRate: number;
  expanded: boolean;
  onToggle: () => void;
  maxRateTextChars: number;
}) {
  if (agentRates.length === 0) return null;
  if (agentRates.length === 1) {
    const { recipientSharePct, agentSharePct } = computeAgentSplit(bucketRecipientRate, Number(agentRates[0].agentRateKey));
    return (
      <span
        style={{ ...ROW_LABEL_TEXT_STYLE, whiteSpace: 'nowrap', display: 'inline-block', textAlign: 'right', width: `${maxRateTextChars}ch` }}
        title={`Agent ${agentSharePct}% of the ${bucketRecipientRate}% bucket rate (Recipient ${recipientSharePct}%)`}
      >
        {agentSharePct}%
      </span>
    );
  }
  return (
    <button
      type="button"
      style={{ ...ROW_LABEL_TEXT_STYLE, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
      onClick={onToggle}
      aria-label={expanded ? 'Collapse agent rates' : 'Expand agent rates'}
      title={expanded ? 'Collapse agent rates' : `${agentRates.length} agent rates — click to expand`}
    >
      {agentRates.length}
      <ChevronDown size={14} style={{ flexShrink: 0, transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none' }} />
    </button>
  );
}

function AgentRateBreakdownRows({
  agentRates,
  bucketRecipientRate,
  keyPrefix,
  shades,
  indentPx,
  decimals,
  onUnstake,
  recipientAddr,
  rateKey,
  agentAddr,
  activeUnstakeKey,
}: {
  agentRates: AgentRateStakeInfo[];
  bucketRecipientRate: number;
  keyPrefix: string;
  shades: readonly [string, string];
  indentPx: number;
  decimals: number;
  onUnstake: (amount: string, agentRateKey: string) => void;
  recipientAddr: string;
  rateKey: string;
  agentAddr: string;
  activeUnstakeKey: string | null;
}) {
  return (
    <>
      {agentRates.map((rate, i) => {
        const { recipientSharePct, agentSharePct } = computeAgentSplit(bucketRecipientRate, Number(rate.agentRateKey));
        const thisKey = unstakeTargetKey(recipientAddr, rateKey, agentAddr, rate.agentRateKey);
        const isThisRowUnstaking = activeUnstakeKey === thisKey;
        const isAnyUnstaking = activeUnstakeKey != null;
        return (
          <div
            key={`${keyPrefix}-rate-${rate.agentRateKey || i}`}
             style={{
               display: 'flex',
               alignItems: 'center',
               gap: 4,
               paddingLeft: indentPx,
               paddingRight: 4,
               paddingTop: 2,
               paddingBottom: 2,
               backgroundColor: shades[i % 2],
             }}
          >
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
              <span
                style={ROW_LABEL_TEXT_STYLE}
                title={`Recipient ${recipientSharePct}% / Agent ${agentSharePct}% of the ${bucketRecipientRate}% bucket rate`}
              >
                {recipientSharePct}%
              </span>
              <span style={{ fontSize: 13, color: '#cbd5e1' }} title={`Agent ${agentSharePct}% of the ${bucketRecipientRate}% bucket rate`}>
                {agentSharePct}%
              </span>
            </div>
            <span style={{ width: 96, flexShrink: 0, textAlign: 'right', fontSize: 13, color: '#94a3b8', whiteSpace: 'nowrap' }}>
              {formatTokenAmountCapped(rate.stakedSPCoins, decimals)}
            </span>
            <div style={{ width: 96, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
              <button
                type="button"
                disabled={isAnyUnstaking}
                style={
                  isThisRowUnstaking
                    ? btnRedBusy
                    : isAnyUnstaking
                      ? btnGreenDisabled
                      : btnGreenBase
                }
                aria-label={`Unstake agent rate ${agentSharePct}%`}
                title={isThisRowUnstaking ? 'Unstaking…' : `Revoke this agent-rate bucket (Agent ${agentSharePct}%)`}
                onClick={() => onUnstake(rate.stakedSPCoins, rate.agentRateKey)}
              >
                {isThisRowUnstaking ? 'Unstaking' : 'Unstake'}
              </button>
            </div>
          </div>
        );
      })}
    </>
  );
}

function AgentBreakdownRows({
  recipientAccount,
  agentAccounts,
  bucketTotal,
  bucketRecipientRate,
  keyPrefix,
  shades,
  agentRateShades,
  indentPx,
  agentRateIndentPx,
  decimals,
  expandedAgentRateKeys,
  onToggleAgentRate,
  onUnstake,
  hideDirectRow,
  expandedAgentAddressText,
  onToggleAgentAddress,
  recipientAddr,
  rateKey,
  activeUnstakeKey,
  maxRateTextChars,
  accountCellSlot,
  avatarSlot,
}: {
  recipientAccount?: spCoinAccount;
  agentAccounts: AgentStakeInfo[];
  bucketTotal: string;
  bucketRecipientRate: number;
  keyPrefix: string;
  shades: readonly [string, string];
  agentRateShades: readonly [string, string];
  indentPx: number;
  agentRateIndentPx: number;
  decimals: number;
  expandedAgentRateKeys: Set<string>;
  onToggleAgentRate: (key: string) => void;
  onUnstake: (amount: string, agent?: spCoinAccount, agentRateKey?: string) => void;
  hideDirectRow?: boolean;
  expandedAgentAddressText: Set<string>;
  onToggleAgentAddress: (address: string) => void;
  recipientAddr: string;
  rateKey: string;
  activeUnstakeKey: string | null;
  maxRateTextChars: number;
  accountCellSlot?: SponsorStakingAccountCellSlot;
  avatarSlot?: (account: spCoinAccount) => React.ReactNode;
}) {
  const hasFailedAgent = agentAccounts.some((agent) => agent.failed);
  const directStakedRaw = computeDirectStakedRaw(bucketTotal, agentAccounts);

  return (
    <>
      {hasFailedAgent && (
        <div key={`${keyPrefix}-unresolved-warning`} style={{ display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 12, paddingRight: 4, paddingTop: 2, paddingBottom: 2, backgroundColor: shades[0] }}>
          <div style={{ width: 24, height: 24, flexShrink: 0 }} />
          <span style={{ color: '#fbbf24', fontSize: 13, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Some agent balances failed to load — totals below may not add up. Refresh to retry.
          </span>
        </div>
      )}
      {!hideDirectRow && directStakedRaw > 0n && (
        <div
          key={`${keyPrefix}-direct`}
          style={{ display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 12, paddingRight: 4, paddingTop: 2, paddingBottom: 2, backgroundColor: shades[0] }}
        >
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, minWidth: ROW_LEADING_SLOT_PX }}>
            <span
              style={{ ...ROW_LABEL_TEXT_STYLE, whiteSpace: 'nowrap', display: 'inline-block', textAlign: 'right', width: `${maxRateTextChars}ch` }}
            >
              {bucketRecipientRate}%
            </span>
          </div>
          {avatarSlot ? avatarSlot(recipientAccount!) : <DefaultAvatarImpl account={recipientAccount!} />}
          <span style={{ minWidth: 0, flex: 1, fontSize: 13, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>No Agent</span>
          <span style={{ width: 96, flexShrink: 0, textAlign: 'right', fontSize: 13, color: '#94a3b8', whiteSpace: 'nowrap' }}>
            {formatTokenAmountCapped(directStakedRaw.toString(), decimals)}
          </span>
          <div style={{ width: 96, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
            <button
              type="button"
              disabled={activeUnstakeKey != null}
              style={
                activeUnstakeKey === unstakeTargetKey(recipientAddr, rateKey)
                  ? btnRedBusy
                  : activeUnstakeKey != null
                    ? btnGreenDisabled
                    : btnGreenBase
              }
              aria-label="Unstake direct (no agent) stake"
              title="Revoke this rate bucket's direct (non-agent) stake"
              onClick={() => onUnstake(directStakedRaw.toString())}
            >
              {activeUnstakeKey === unstakeTargetKey(recipientAddr, rateKey) ? 'Unstaking' : 'Unstake'}
            </button>
          </div>
        </div>
      )}
      {agentAccounts.map(({ account: agentAccount, stakedSPCoins, agentRates: rawAgentRates, failed }, i) => {
        const agentAddr = String(agentAccount.address ?? '').trim();
        const agentLabel = agentAccount.name || 'Unnamed Agent';
        const agentRowKey = `${keyPrefix}-agent-${agentAddr || i}`;
        const thisAgentKey = unstakeTargetKey(recipientAddr, rateKey, agentAddr);
        const isThisAgentRowUnstaking = activeUnstakeKey === thisAgentKey;
        const isAnyUnstaking = activeUnstakeKey != null;
        const agentRates = visibleAgentRates(rawAgentRates);
        const agentRatesExpanded = agentRates.length > 1 && expandedAgentRateKeys.has(agentRowKey);
        const isAgentAddressExpanded = expandedAgentAddressText.has(agentRowKey);

        return (
          <React.Fragment key={agentRowKey}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                paddingLeft: indentPx,
                paddingRight: 4,
                paddingTop: 2,
                paddingBottom: 2,
                color: '#5981F3',
                backgroundColor: shades[(i + (hasFailedAgent ? 2 : 1)) % 2],
              }}
            >
              {(() => {
                const indicator = !failed && (
                  <AgentOwnRateIndicator
                    agentRates={agentRates}
                    bucketRecipientRate={bucketRecipientRate}
                    expanded={agentRatesExpanded}
                    onToggle={() => onToggleAgentRate(agentRowKey)}
                    maxRateTextChars={maxRateTextChars}
                  />
                );
                const icon = accountCellSlot ? (
                  (() => {
                    const AccountCell = accountCellSlot;
                    return (
                      <AccountCell
                        account={agentAccount}
                        mode={SP_COIN_DISPLAY.AGENT_ACCOUNT}
                        label={agentLabel}
                        addrPrePostSize={isAgentAddressExpanded ? agentAddr.length : 4}
                        addressSizeClassName={undefined}
                        onAddressClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          onToggleAgentAddress(agentRowKey);
                        }}
                      />
                    );
                  })()
                ) : (
                  <DefaultAccountCellImpl account={agentAccount} />
                );
                return (
                  <>
                    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, minWidth: ROW_LEADING_SLOT_PX, ...ROW_LABEL_TEXT_STYLE, whiteSpace: 'nowrap' }}>
                      {indicator}
                    </div>
                    {icon}
                  </>
                );
              })()}
              <span style={{ flex: 1, minWidth: 0 }} />
              {isAgentAddressExpanded ? null : (
                <span
                  style={{ width: 96, flexShrink: 0, textAlign: 'right', fontSize: 13, whiteSpace: 'nowrap', color: failed ? '#fbbf24' : '#94a3b8' }}
                  title={failed ? 'On-chain read failed — not a verified balance' : undefined}
                >
                  {failed ? 'Failed' : agentRatesExpanded ? null : formatTokenAmountCapped(stakedSPCoins, decimals)}
                </span>
              )}
              {isAgentAddressExpanded ? null : (
                <div style={{ width: 96, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                  {!agentRatesExpanded && (
                    <button
                      type="button"
                      disabled={isAnyUnstaking}
                      style={
                        isThisAgentRowUnstaking
                          ? btnRedBusy
                          : isAnyUnstaking
                            ? btnGreenDisabled
                            : btnGreenBase
                      }
                      aria-label={`Unstake ${agentLabel}`}
                      title={isThisAgentRowUnstaking ? 'Unstaking…' : `Revoke this rate bucket (via ${agentLabel})`}
                      onClick={() => onUnstake(stakedSPCoins, agentAccount)}
                    >
                      {isThisAgentRowUnstaking ? 'Unstaking' : 'Unstake'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {agentRatesExpanded && (
              <AgentRateBreakdownRows
                agentRates={agentRates}
                bucketRecipientRate={bucketRecipientRate}
                keyPrefix={agentRowKey}
                shades={agentRateShades}
                indentPx={agentRateIndentPx}
                decimals={decimals}
                onUnstake={(amount, agentRateKey) => onUnstake(amount, agentAccount, agentRateKey)}
                recipientAddr={recipientAddr}
                rateKey={rateKey}
                agentAddr={agentAddr}
                activeUnstakeKey={activeUnstakeKey}
              />
            )}
          </React.Fragment>
        );
      })}
    </>
  );
}

// ── Main component ───────────────────────────────────────────────────────

export default function SponsorStakingListPanel({
  recipients,
  stakeInfoByAddress,
  decimals,
  loading,
  error,
  activeUnstakeKey = null,
  accountCellSlot,
  avatarSlot,
  loadingContent,
  confirmPopupContent,
  onConfirmUnstake,
  onCancelUnstake,
  panelId = SP_COIN_DISPLAY.SPONSOR_STAKING_LIST,
}: SponsorStakingListPanelProps) {
  const [confirmTarget, setConfirmTarget] = useState<UnstakeTarget | null>(null);
  const [confirmTotalAmount, setConfirmTotalAmount] = useState<string | undefined>(undefined);

  const [expandedAddresses, setExpandedAddresses] = useState<Set<string>>(new Set());
  const [expandedAddressText, setExpandedAddressText] = useState<Set<string>>(new Set());
  const [expandedAgentAddressText, setExpandedAgentAddressText] = useState<Set<string>>(new Set());
  const [expandedAgentKeys, setExpandedAgentKeys] = useState<Set<string>>(new Set());
  const [expandedAgentRateKeys, setExpandedAgentRateKeys] = useState<Set<string>>(new Set());

  const toggleExpanded = useCallback((address: string) => {
    setExpandedAddresses((current) => {
      const next = new Set(current);
      if (next.has(address)) next.delete(address);
      else next.add(address);
      return next;
    });
  }, []);

  const toggleAddressTextExpanded = useCallback((address: string) => {
    setExpandedAddressText((current) => {
      const next = new Set(current);
      if (next.has(address)) next.delete(address);
      else next.add(address);
      return next;
    });
  }, []);

  const toggleAgentAddressTextExpanded = useCallback((address: string) => {
    setExpandedAgentAddressText((current) => {
      const next = new Set(current);
      if (next.has(address)) next.delete(address);
      else next.add(address);
      return next;
    });
  }, []);

  const toggleAgentExpanded = useCallback((key: string) => {
    setExpandedAgentKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const toggleAgentRateExpanded = useCallback((key: string) => {
    setExpandedAgentRateKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  type RecipientRateKey = keyof typeof EXPANDED_ROW_SHADES_BY_PARENT;

  function getShadeKey(index: number): RecipientRateKey {
    return index % 2 === 0 ? 'rowA' : 'rowB';
  }

  const anyStakeInfoPending = recipients.some(
    (recipient) => stakeInfoByAddress[String(recipient.address ?? '').trim()] === undefined,
  );

  const totalStakedDisplay = (() => {
    const total = recipients.reduce((sum, recipient) => {
      const entries = stakeInfoByAddress[String(recipient.address ?? '').trim()] ?? [];
      return sum + sumStakedRaw(entries);
    }, 0n);
    return formatTokenAmountCapped(total.toString(), decimals);
  })();

  const maxRateTextChars = (() => {
    let max = 0;
    for (const r of recipients) {
      const addr = String(r.address ?? '').trim();
      const info = stakeInfoByAddress[addr];
      if (!info || info.length === 0) continue;

      if (info.length > 1) {
        max = Math.max(max, `${computeRecipientWeightedSharePct(info)}%`.length);
        for (const bucket of info) {
          max = Math.max(max, `${Number(bucket.rateKey)}%`.length);
          const bucketAgents = visibleAgentAccounts(bucket.agentAccounts);
          if (bucketAgents.length > 0) {
            const directPct = computeBucketDirectSharePct(Number(bucket.rateKey), bucketAgents);
            max = Math.max(max, `${directPct}%`.length);
          }
        }
      } else {
        const bucket = info[0];
        max = Math.max(max, `${Number(bucket.rateKey)}%`.length);
        const bucketAgents = visibleAgentAccounts(bucket.agentAccounts);
        if (bucketAgents.length > 0) {
          max = Math.max(max, `${computeRecipientWeightedSharePct(info)}%`.length);
        }
      }
    }
    return Math.max(max, 4) + 1;
  })();

  const handleUnstake = useCallback(
    (recipient: spCoinAccount, amount: string, rateKey?: string, agent?: spCoinAccount, agentRateKey?: string) => {
      if (activeUnstakeKey != null) return;
      const target: UnstakeTarget = { recipient, amount, rateKey, agent, agentRateKey };
      setConfirmTarget(target);
      setConfirmTotalAmount(formatTokenAmount(amount, decimals));
    },
    [activeUnstakeKey, decimals],
  );

  const handleCancelUnstake = useCallback(() => {
    setConfirmTarget(null);
    setConfirmTotalAmount(undefined);
    onCancelUnstake?.();
  }, [onCancelUnstake]);

  const handleConfirmUnstake = useCallback(
    async (amount?: string) => {
      if (!confirmTarget) return;
      const { recipient, rateKey, agent, agentRateKey, amount: targetAmount } = confirmTarget;
      // Close popup and call wrapper to run the actual unstake transaction.
      // The wrapper manages activeUnstakeKey (shows "Unstaking…" on the button)
      // and clears it after the tx completes.
      setConfirmTarget(null);
      setConfirmTotalAmount(undefined);
      await onConfirmUnstake?.({ recipient, amount: targetAmount, rateKey, agent, agentRateKey }, amount);
    },
    [confirmTarget, onConfirmUnstake],
  );

  const headerRow = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 12, paddingRight: 4, paddingTop: 8, paddingBottom: 8, borderBottom: '1px solid #000000', backgroundColor: '#2b2b2b', borderRadius: '8px 8px 0 0' }}>
      <span style={{ flex: 1, minWidth: 0, textAlign: 'left', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(148, 163, 187, 0.8)' }}>Recipient / Agent</span>
      <span style={{ width: 96, flexShrink: 0, textAlign: 'center', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(148, 163, 187, 0.8)' }} />
      <span style={{ width: 96, flexShrink: 0, textAlign: 'right', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(148, 163, 187, 0.8)' }}>Amount</span>
      <span style={{ width: 96, flexShrink: 0, textAlign: 'center', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(148, 163, 187, 0.8)' }}>Options</span>
    </div>
  );

  const footerRow = !loading && !error && recipients.length > 0 && (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 12, paddingRight: 4, paddingTop: 8, paddingBottom: 8, borderTop: '1px solid #000000', backgroundColor: '#2b2b2b', borderRadius: '0 0 8px 8px' }}>
      <span style={{ flex: 1, minWidth: 0, textAlign: 'left', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(148, 163, 187, 0.8)' }}>Total</span>
      <span style={{ width: 96, flexShrink: 0 }} />
      <span style={{ width: 96, flexShrink: 0, textAlign: 'right', fontSize: 12, fontWeight: 600, color: 'rgba(148, 163, 187, 0.8)' }}>
        {anyStakeInfoPending ? <span style={{ opacity: 0.5 }}>Loading…</span> : totalStakedDisplay}
      </span>
      <span style={{ width: 96, flexShrink: 0 }} />
    </div>
  );

  return (
    <PanelGate panel={panelId} className="h-full min-h-0 flex flex-col overflow-hidden">
      <div style={{ position: 'relative' }}>
        <TabBodyMarker path="SponsorStakingListPanel.tsx" build={PACKAGE_BUILD} />
      </div>

      <ScrollTablePanel
        id="SPONSOR_STAKING_LIST"
        header={headerRow}
        footer={footerRow}
        style={{ color: '#5981F3' }}
      >
        {loading && (
          <div style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: 16 }}>
            {loadingContent || 'Loading recipients…'}
          </div>
        )}

        {!loading && error && (
          <div style={{ fontSize: 13, color: '#f87171', textAlign: 'center', padding: 16 }}>{error}</div>
        )}

        {!loading && !error && recipients.length === 0 && (
          <div style={{ fontSize: 13, color: 'rgba(156, 163, 175, 0.6)', textAlign: 'center', padding: 16 }}>
            No active staked sponsorships for this account.
          </div>
        )}

        {!loading && !error && recipients.map((recipient, i) => {
          const recipientAddr = String(recipient.address ?? '').trim();
          const isAddressExpanded = expandedAddressText.has(recipientAddr);
          const rawStakeInfo = stakeInfoByAddress[recipientAddr];
          const isPending = rawStakeInfo === undefined;
          const stakeInfo = rawStakeInfo ?? [];
          const parentShadeKey = getShadeKey(i);
          const rowBg = ROW_BG_BY_PARENT[parentShadeKey];
          const expandedRowShades = EXPANDED_ROW_SHADES_BY_PARENT[parentShadeKey];
          const agentRowShades = AGENT_ROW_SHADES_BY_PARENT[parentShadeKey];
          const agentRateRowShades = AGENT_RATE_ROW_SHADES_BY_PARENT[parentShadeKey];
          const hasMultipleRates = stakeInfo.length > 1;
          const expanded = hasMultipleRates && expandedAddresses.has(recipientAddr);
          const totalStakedRaw = sumStakedRaw(stakeInfo);
          const totalDisplay = formatTokenAmountCapped(totalStakedRaw.toString(), decimals);

          const singleRateInfo = !hasMultipleRates ? stakeInfo[0] : undefined;
          const singleRateAgentToggleKey = singleRateInfo ? `${recipientAddr}:${singleRateInfo.rateKey}` : '';
          const singleRateVisibleAgentAccounts = singleRateInfo ? visibleAgentAccounts(singleRateInfo.agentAccounts) : [];
          const singleRateAgentsExpanded =
            singleRateVisibleAgentAccounts.length > 0 && expandedAgentKeys.has(singleRateAgentToggleKey);

          const sponsorSharePct = singleRateInfo ? Math.round((100 - Number(singleRateInfo.rateKey)) * 100) / 100 : 0;
          const recipientWeightedSharePct = computeRecipientWeightedSharePct(stakeInfo);

          return (
            <React.Fragment key={recipientAddr}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 12, paddingRight: 4, paddingTop: 8, paddingBottom: 8, backgroundColor: rowBg }}>
                <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: ROW_LEADING_SLOT_PX }}>
                  {isPending ? (
                    <span style={{ fontSize: 13, color: '#94a3b8', whiteSpace: 'nowrap' }}>Loading…</span>
                  ) : stakeInfo.length === 0 ? (
                    <span style={{ color: '#64748a', whiteSpace: 'nowrap' }} title="This recipient has no active rate buckets">
                      No stake
                    </span>
                  ) : hasMultipleRates ? (
                    <button
                      type="button"
                      style={{ ...ROW_LABEL_TEXT_STYLE, display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', cursor: 'pointer' }}
                      onClick={() => toggleExpanded(recipientAddr)}
                      aria-label={expanded ? 'Collapse rate breakdown' : 'Expand rate breakdown'}
                      title={
                        expanded
                          ? 'Collapse rate breakdown'
                          : `Recipient ${recipientWeightedSharePct}% overall, stake-weighted across all ${stakeInfo.length} rate buckets — click to expand`
                      }
                    >
                      <span style={{ display: 'inline-block', textAlign: 'right', width: `${maxRateTextChars}ch` }}>
                        {recipientWeightedSharePct}%
                      </span>
                      <ChevronDown size={14} style={{ flexShrink: 0, transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none' }} />
                    </button>
                  ) : (
                    <div
                      style={{ ...ROW_LABEL_TEXT_STYLE, display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}
                      title={
                        singleRateVisibleAgentAccounts.length > 0
                          ? singleRateAgentsExpanded
                            ? 'Collapse agent breakdown'
                            : `Sponsor ${sponsorSharePct}% / Recipient ${recipientWeightedSharePct}% / Agent ${Math.round((Number(singleRateInfo!.rateKey) - recipientWeightedSharePct) * 100) / 100}% — click to expand`
                          : undefined
                      }
                    >
                      <span style={{ display: 'inline-block', textAlign: 'right', width: `${maxRateTextChars}ch` }}>
                        {singleRateAgentsExpanded ? recipientWeightedSharePct : Number(singleRateInfo!.rateKey)}%
                      </span>
                      <AgentRateIndicator
                        agentAccounts={singleRateVisibleAgentAccounts}
                        agentKeysFailed={singleRateInfo!.agentKeysFailed}
                        expanded={singleRateAgentsExpanded}
                        onToggle={() => toggleAgentExpanded(singleRateAgentToggleKey)}
                      />
                    </div>
                  )}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                   {(() => {
                     if (!accountCellSlot) {
                       return <DefaultAccountCellImpl
                         account={{ ...recipient, address: recipientAddr.toLowerCase() as `0x${string}` }}
                       />;
                     }
                     const AccountCell = accountCellSlot;
                     return (
                       <AccountCell
                         account={{ ...recipient, address: recipientAddr.toLowerCase() as `0x${string}` }}
                         mode={SP_COIN_DISPLAY.RECIPIENT_ACCOUNT}
                         label="Unnamed Recipient"
                         addrPrePostSize={isAddressExpanded ? recipientAddr.length : 4}
                         addressSizeClassName={isAddressExpanded ? undefined : 'text-base'}
                         onAddressClick={(e: React.MouseEvent) => {
                           e.stopPropagation();
                           toggleAddressTextExpanded(recipientAddr);
                         }}
                       />
                     );
                   })()}
                </div>
                <div style={{ width: 96, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: 13 }}>
                  {isAddressExpanded ? null : isPending ? (
                    <span style={{ fontSize: 13, color: '#94a3b8', whiteSpace: 'nowrap' }}>Loading…</span>
                  ) : stakeInfo.length === 0 ? (
                    <span style={{ color: '#64748a', whiteSpace: 'nowrap' }} title="This recipient has no active rate buckets">
                      No stake
                    </span>
                  ) : expanded || singleRateAgentsExpanded ? null : (
                    <span style={{ color: '#e2e8f0', whiteSpace: 'nowrap' }}>{totalDisplay}</span>
                  )}
                </div>
                <div style={{ width: 96, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                  {!isAddressExpanded && !expanded && !singleRateAgentsExpanded && (() => {
                    const thisKey = unstakeTargetKey(recipientAddr);
                    const isThisRowUnstaking = activeUnstakeKey === thisKey;
                    return (
                      <button
                        type="button"
                        disabled={activeUnstakeKey != null}
                        style={
                          isThisRowUnstaking
                            ? btnRedBusy
                            : activeUnstakeKey != null
                              ? btnGreenDisabled
                              : btnGreenBase
                        }
                        aria-label={`Unstake ${recipient.name || recipient.symbol}`}
                        title={isThisRowUnstaking ? 'Unstaking…' : 'Revoke sponsorship for this recipient'}
                        onClick={() => handleUnstake(recipient, totalStakedRaw.toString())}
                      >
                        {isThisRowUnstaking ? 'Unstaking' : 'Unstake'}
                      </button>
                    );
                  })()}
                </div>
              </div>

              {singleRateInfo && singleRateAgentsExpanded && (
                <AgentBreakdownRows
                  recipientAccount={recipient}
                  agentAccounts={singleRateVisibleAgentAccounts}
                  bucketTotal={singleRateInfo.stakedSPCoins}
                  bucketRecipientRate={Number(singleRateInfo.rateKey)}
                  keyPrefix={singleRateAgentToggleKey}
                  shades={agentRowShades}
                  agentRateShades={agentRateRowShades}
                  indentPx={SINGLE_RATE_AGENT_ROW_INDENT_PX}
                  agentRateIndentPx={SINGLE_RATE_AGENT_RATE_ROW_INDENT_PX}
                  decimals={decimals}
                  expandedAgentRateKeys={expandedAgentRateKeys}
                  onToggleAgentRate={toggleAgentRateExpanded}
                  onUnstake={(amount, agent, agentRateKey) =>
                    handleUnstake(recipient, amount, singleRateInfo.rateKey, agent, agentRateKey)
                  }
                  expandedAgentAddressText={expandedAgentAddressText}
                  onToggleAgentAddress={toggleAgentAddressTextExpanded}
                  recipientAddr={recipientAddr}
                  rateKey={singleRateInfo.rateKey}
                  activeUnstakeKey={activeUnstakeKey ?? null}
                  maxRateTextChars={maxRateTextChars}
                  accountCellSlot={accountCellSlot}
                  avatarSlot={avatarSlot}
                />
              )}

              {expanded && [...stakeInfo]
                .sort((a, b) => Number(b.rateKey) - Number(a.rateKey))
                .map((info, i2) => {
                  const agentAccounts = visibleAgentAccounts(info.agentAccounts);
                  const agentToggleKey = `${recipientAddr}:${info.rateKey}`;
                  const agentsExpanded = agentAccounts.length > 0 && expandedAgentKeys.has(agentToggleKey);
                  const directStakedRaw = computeDirectStakedRaw(info.stakedSPCoins, agentAccounts);
                  const bucketHasVisibleAgent = agentAccounts.length > 0;
                  const directSharePct = bucketHasVisibleAgent
                    ? computeBucketDirectSharePct(Number(info.rateKey), agentAccounts)
                    : Number(info.rateKey);
                  const splitDirectRow = bucketHasVisibleAgent && agentsExpanded;
                  return (
                    <React.Fragment key={`${recipientAddr}-rate-${info.rateKey}-${i2}`}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 12, paddingRight: 4, paddingTop: 2, paddingBottom: 2, backgroundColor: expandedRowShades[i2 % 2] }}>
                        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', fontSize: 13, color: '#94a3b8' }}>
                          <div style={{ width: RATE_ROW_INDENT_PX - ROW_BASE_PADDING_PX }}>{i2 + 1}.</div>
                        </div>
                        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, minWidth: ROW_LEADING_SLOT_PX }}>
                          <span
                            style={{ ...ROW_LABEL_TEXT_STYLE, whiteSpace: 'nowrap', display: 'inline-block', textAlign: 'right', width: `${maxRateTextChars}ch` }}
                            title={splitDirectRow ? `Recipient ${directSharePct}% of the ${info.rateKey}% bucket rate` : undefined}
                          >
                            {splitDirectRow ? directSharePct : Number(info.rateKey)}%
                          </span>
                          <AgentRateIndicator
                            agentAccounts={agentAccounts}
                            agentKeysFailed={info.agentKeysFailed}
                            expanded={agentsExpanded}
                            onToggle={() => toggleAgentExpanded(agentToggleKey)}
                          />
                        </div>
                        {splitDirectRow ? (
                          <>
                            {avatarSlot ? avatarSlot(recipient) : <DefaultAvatarImpl account={recipient} />}
                            <span style={{ minWidth: 0, flex: 1, fontSize: 13, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Recipient</span>
                          </>
                        ) : agentAccounts.length === 0 ? (
                          <DirectNoAgentRowFields
                            recipient={recipient}
                            amountRaw={info.stakedSPCoins}
                            decimals={decimals}
                            onUnstake={() => handleUnstake(recipient, info.stakedSPCoins, info.rateKey)}
                            unstakeAriaLabel={`Unstake ${recipient.name || recipient.symbol} at rate ${info.rateKey}%`}
                            unstakeTitle={`Revoke this ${info.rateKey}% rate bucket for this recipient`}
                            isThisRowUnstaking={activeUnstakeKey === unstakeTargetKey(recipientAddr, info.rateKey)}
                            isAnyUnstaking={activeUnstakeKey != null}
                            avatarSlot={avatarSlot}
                          />
                        ) : (
                          <>
                            <span style={{ minWidth: 0, flex: 1, fontSize: 13, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {agentAccounts.length > 1 ? 'Recipient/Agents' : 'Recipient/Agent'}
                            </span>
                            <span style={{ width: 96, flexShrink: 0, textAlign: 'right', fontSize: 13, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                              {formatTokenAmountCapped(info.stakedSPCoins, decimals)}
                            </span>
                            <div style={{ width: 96, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                              {(() => {
                                const soleAgent =
                                  agentAccounts.length === 1 && directStakedRaw === 0n
                                    ? agentAccounts[0]
                                    : undefined;
                                const amount = soleAgent ? soleAgent.stakedSPCoins : info.stakedSPCoins;
                                const thisKey = unstakeTargetKey(
                                  recipientAddr,
                                  info.rateKey,
                                  soleAgent ? String(soleAgent.account.address ?? '').trim() : undefined,
                                );
                                const isThisRowUnstaking = activeUnstakeKey === thisKey;
                                return (
                                  <button
                                    type="button"
                                    disabled={activeUnstakeKey != null}
                                    style={
                                      isThisRowUnstaking
                                        ? btnRedBusy
                                        : activeUnstakeKey != null
                                          ? btnGreenDisabled
                                          : btnGreenBase
                                    }
                                    aria-label={`Unstake ${recipient.name || recipient.symbol} at rate ${info.rateKey}%`}
                                    title={isThisRowUnstaking ? 'Unstaking…' : `Revoke this ${info.rateKey}% rate bucket for this recipient`}
                                    onClick={() => handleUnstake(recipient, amount, info.rateKey, soleAgent?.account)}
                                  >
                                    {isThisRowUnstaking ? 'Unstaking' : 'Unstake'}
                                  </button>
                                );
                              })()}
                            </div>
                          </>
                        )}
                      </div>

                      {agentsExpanded && (
                        <AgentBreakdownRows
                          recipientAccount={recipient}
                          agentAccounts={agentAccounts}
                          bucketTotal={info.stakedSPCoins}
                          bucketRecipientRate={Number(info.rateKey)}
                          keyPrefix={agentToggleKey}
                          shades={agentRowShades}
                          agentRateShades={agentRateRowShades}
                          indentPx={AGENT_ROW_INDENT_PX}
                          agentRateIndentPx={AGENT_RATE_ROW_INDENT_PX}
                          decimals={decimals}
                          expandedAgentRateKeys={expandedAgentRateKeys}
                          onToggleAgentRate={toggleAgentRateExpanded}
                          onUnstake={(amount, agent, agentRateKey) =>
                            handleUnstake(recipient, amount, info.rateKey, agent, agentRateKey)
                          }
                          expandedAgentAddressText={expandedAgentAddressText}
                          onToggleAgentAddress={toggleAgentAddressTextExpanded}
                          recipientAddr={recipientAddr}
                          rateKey={info.rateKey}
                          activeUnstakeKey={activeUnstakeKey ?? null}
                          maxRateTextChars={maxRateTextChars}
                          accountCellSlot={accountCellSlot}
                          avatarSlot={avatarSlot}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
            </React.Fragment>
          );
        })}
      </ScrollTablePanel>

      {confirmPopupContent
        ? confirmPopupContent({
            isOpen: confirmTarget != null,
            target: confirmTarget,
            totalAmount: confirmTotalAmount,
            onConfirm: handleConfirmUnstake,
            onCancel: handleCancelUnstake,
          })
        : null}
    </PanelGate>
  );
}
