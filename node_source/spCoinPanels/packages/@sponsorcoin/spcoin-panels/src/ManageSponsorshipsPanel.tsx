// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/ManageSponsorshipsPanel.tsx
// Portable shell for MANAGE_SPONSORSHIPS_PANEL (2026-09-12, revised 2026-09-24
// — "Extend the shell first"). The ORIGINAL version (2026-09-12) was a flat
// "Total Pending Rewards / [amount] / Claim" row + an empty
// GenericListPanel — it had no counterpart anywhere in the real app:
// components/views/RadioOverlayPanels/ManageSponsorshipsPanel.tsx actually
// renders a real SpCoins/Amount/Options table (Trading, Staked, Pending rows;
// Pending expands into Sponsor/Recipient/Agent sub-rows; a closing Total Coins
// row) that was simply never ported.
//
// 2026-09-24 — "Extend the shell first" promotion: this revision ports the
// real table's SHAPE + its full per-row state machine (loading, hover "N/A"
// swap, claim-in-progress "..." spinner, per-role estimate/claim, role
// availability, zero-amount guards) into the shell itself, using INLINE styles
// only — no Tailwind — so the extension (spCoinExtension) renders the same
// table it always did, in the same colors (REWARD_ROW_BG_A/B, which the real
// table's msTableTw.rowA/rowB are documented as the same values), with no
// changes to the extension's own build pipeline. See docs/design/
// extensionPlan.md's "Fourth slice" + "MANAGE_SPONSORSHIPS_PANEL shell-first"
// entries for the full investigation.
//
// Opaque-slot split (Stage 45): every NON-portable piece stays in the web
// app's thin wrapper (components/views/RadioOverlayPanels/
// ManageSponsorshipsPanel.tsx) and is fed in via props/slots — the AddressSelect
// tree (ExchangeContext/AssetSelect providers), the real on-chain estimate/
// claim calls (runRewardAction/runTotalRewardAction/runAvailableRoleRewardEstimates),
// the usePanelVisible panel-tree reads, the autoRefresh store, the ToDo
// overlay (doToDo/showToDo/todoMode/sessionStorage), and every derived display
// string (tradingAmountDisplay/stakedAmountDisplay/pendingTotalAmountDisplay/
// totalCoinsDisplay) — all resolved there and passed down. This shell is
// hook-free (barring local hover state) and @/-alias-free; an extension caller
// renders it inert by simply omitting props (all optional, safe zero/false
// defaults), exactly like every other component in this package.
// `pendingVisible` defaults to TRUE (expanded) when omitted, matching the
// extension MeritWallet's own "show the Rewards table fully expanded by
// default" seed for MANAGE_PENDING_REWARDS (see spCoinExtension MeritWallet.tsx
// lines 706-713); the web wrapper always passes this explicitly from
// usePanelVisible.
//
// Hover "N/A" swap: Trading/Staked/collapsed-Pending's buttons swap their
// label to "N/A" on hover only when the balance is zero (or the role is
// unavailable / no account); loading shows "Loading..." (orange pulse); a
// claim in flight shows "...". These mirror the real web table exactly.

'use client';

import React, { useState } from 'react';
import { PACKAGE_BUILD } from './packageBuildTag';
import TabBodyMarker from './TabBodyMarker';
import { REWARD_ROW_BG_A, REWARD_ROW_BG_B, REWARD_ROW_LABEL_WIDTH } from './RewardRow';

export type ManageSponsorshipRole = 'Sponsor' | 'Recipient' | 'Agent';

export interface ManageSponsorshipRoleRow {
  role: ManageSponsorshipRole;
  amount?: string;
  available?: boolean;
  loading?: boolean;
  error?: string;
}

export interface ManageSponsorshipsPanelProps {
  // --- Inert labels (kept for backward compatibility with extension
  //     MeritWallet.tsx's `createElement(ManageSponsorshipsPanel, {})` call,
  //     which passes no props) ---
  tradingAmountText?: string;
  stakedAmountText?: string;
  pendingAmountText?: string;
  totalCoinsText?: string;
  onStake?: () => void;
  onUnstake?: () => void;
  /** @deprecated No-op; retained so existing callers compile. */
  onTogglePending?: () => void;
  /** @deprecated No-op; retained so existing callers compile. */
  onClaimAll?: () => void;
  /** @deprecated No-op; retained so existing callers compile. */
  pendingByAccountType?: unknown;

  // --- Opaque slots (non-portable surfaces live in the wrapper) ---
  addressSelectContent?: React.ReactNode;
  todoContent?: React.ReactNode;

  // --- Auto Refresh checkbox ---
  autoRefresh?: boolean;
  onAutoRefreshChange?: (v: boolean) => void;

  // --- Trading row ---
  /** Mirrors the real `tradingOrStalledLoading` (accountRecordLoading). */
  tradingOrStalledLoading?: boolean;
  tradingIsZero?: boolean;

  // --- Staked row ---
  stakedIsZero?: boolean;
  /** Opens the ACTIVE_SPONSORSHIPS list when the Staked label is clicked. */
  onStakedLabelClick?: () => void;

  // --- Pending (collapsed) row + Pending Rewards group ---
  /** True => group expanded (MANAGE_PENDING_REWARDS open). Defaults to TRUE
   *  when omitted so the extension renders the table fully expanded by
   *  default; the web wrapper always passes this explicitly. */
  pendingVisible?: boolean;
  pendingInitialLoading?: boolean;
  pendingRoleUnavailable?: boolean;
  pendingIsZero?: boolean;
  /** True when a total-reward claim is in flight; renders the "..." spinner. */
  pendingClaimInProgress?: boolean;
  /** True => the collapsed Pending Claim button must be natively disabled
   *  (no active account/contract, or claim already in flight). */
  pendingClaimDisabled?: boolean;
  pendingErrorText?: string;

  onPendingEstimate?: () => void;
  onPendingClaim?: () => void;
  /** Right-click on the collapsed Pending row opens the group. */
  onOpenPendingGroup?: () => void;
  /** Left-click on the expanded Pending header re-estimates roles. */
  onPendingHeaderEstimate?: () => void;
  /** Right-click on the expanded Pending header closes the group. */
  onClosePendingGroup?: () => void;

  // --- Expanded role rows ---
  rewardRows?: ManageSponsorshipRoleRow[];
  onRoleEstimate?: (role: ManageSponsorshipRole) => void;
  onRoleClaim?: (role: ManageSponsorshipRole) => void;
}

const LABEL_W = REWARD_ROW_LABEL_WIDTH;

const rowPad: React.CSSProperties = { paddingTop: 1.5, paddingBottom: 1.5 };
const headerPad: React.CSSProperties = { paddingTop: 3, paddingBottom: 3 };
const col0Style: React.CSSProperties = { width: LABEL_W, minWidth: LABEL_W, maxWidth: LABEL_W };
const amountCommon = { flex: 1, textAlign: 'left' as const, fontSize: 10, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const };

const btnBase: React.CSSProperties = {
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
};
const btnGreen: React.CSSProperties = { ...btnBase, background: '#147f3b', color: '#ffffff', cursor: 'pointer' };
const btnOrange: React.CSSProperties = { ...btnBase, background: '#b8860b', color: '#ffffff', cursor: 'pointer' };
const btnOrangePulse: React.CSSProperties = { ...btnBase, background: '#b8860b', color: '#ffffff', opacity: 0.6, cursor: 'not-allowed' };
const btnRed: React.CSSProperties = { ...btnBase, background: '#ef4444', color: '#ffffff', cursor: 'pointer' };

export default function ManageSponsorshipsPanel({
  tradingAmountText = '0',
  stakedAmountText = '0',
  pendingAmountText = '0',
  totalCoinsText = '0',
  tradingOrStalledLoading,
  tradingIsZero,
  onStake,
  onUnstake,
  onStakedLabelClick,
  stakedIsZero,
  autoRefresh,
  onAutoRefreshChange,
  pendingVisible = true,
  pendingInitialLoading,
  pendingRoleUnavailable,
  pendingIsZero,
  pendingClaimInProgress,
  pendingClaimDisabled,
  pendingErrorText,
  onPendingEstimate,
  onPendingClaim,
  onOpenPendingGroup,
  onPendingHeaderEstimate,
  onClosePendingGroup,
  rewardRows = [],
  onRoleEstimate,
  onRoleClaim,
  addressSelectContent,
  todoContent,
}: ManageSponsorshipsPanelProps) {
  const [tradingHover, setTradingHover] = useState(false);
  const [stakedHover, setStakedHover] = useState(false);
  const [pendingHover, setPendingHover] = useState(false);

  const showPendingGroup = pendingVisible;
  const pendingClaiming = !!pendingClaimInProgress;
  const tradeLoading = !!tradingOrStalledLoading;
  const totalRowBg = showPendingGroup ? REWARD_ROW_BG_A : REWARD_ROW_BG_B;

  return (
    <div id="MANAGE_SPONSORSHIPS_PANEL" style={{ position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
      <TabBodyMarker path="ManageSponsorshipsPanel.tsx" build={PACKAGE_BUILD} />

      {addressSelectContent ? (
        <div style={{ marginBottom: 0, flexShrink: 0 }}>{addressSelectContent}</div>
      ) : null}

      {/* Auto Refresh checkbox */}
      {autoRefresh !== undefined && (
        <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 12, color: '#94a3b8' }}>
            <input
              type="checkbox"
              checked={!!autoRefresh}
              onChange={(e) => onAutoRefreshChange?.(e.target.checked)}
              style={{ width: 13, height: 13, cursor: 'pointer', accentColor: '#5981F3' }}
            />
            Auto Refresh
          </label>
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, overflowX: 'auto', overflowY: 'auto' }}>
        <table id="MANAGE_SPONSORSHIPS_TABLE" style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed', fontSize: 10 }}>
          <colgroup>
            <col style={col0Style} />
            <col />
            <col />
          </colgroup>

          <thead>
            <tr style={{ background: '#2b2b2b', borderBottom: '1px solid #000000' }}>
              <th scope="col" style={{ ...col0Style, ...headerPad }} align="left">
                <span style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8' }}>SpCoins</span>
              </th>
              <th scope="col" style={headerPad} align="left">
                <span style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8' }}>Amount</span>
              </th>
              <th scope="col" style={headerPad} align="center">
                <span style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8' }}>Options</span>
              </th>
            </tr>
          </thead>

          <tbody>
            {/* Trading */}
            <tr style={{ borderTop: '1px solid #1e293b' }}>
              <td style={{ ...col0Style, ...rowPad, background: REWARD_ROW_BG_A }} align="left">
                <div style={{ padding: '5px 5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title="SpCoins Available for Staking/Trading">
                  Trading
                </div>
              </td>
              <td style={rowPad} align="left">
                <div style={amountCommon} title={tradingAmountText}>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tradingAmountText}</span>
                </div>
              </td>
              <td style={rowPad} align="center">
                <div
                  style={{ display: 'flex', justifyContent: 'center' }}
                  onMouseEnter={() => setTradingHover(true)}
                  onMouseLeave={() => setTradingHover(false)}
                >
                  <button
                    type="button"
                    style={tradeLoading ? btnOrangePulse : (tradingIsZero ? (tradingHover ? btnRed : btnOrange) : btnGreen)}
                    onClick={() => { if (!tradeLoading && !tradingIsZero) onStake?.(); }}
                    onMouseEnter={() => setTradingHover(true)}
                    onMouseLeave={() => setTradingHover(false)}
                    aria-disabled={tradeLoading}
                    aria-label="Open Trading Coins config"
                    title={tradeLoading ? 'Loading...' : tradingIsZero ? 'Cannot Stake with 0 Balance' : 'Stake New Sponsorships'}
                  >
                    {tradeLoading ? 'Loading...' : tradingIsZero && tradingHover ? 'N/A' : 'Stake'}
                  </button>
                </div>
              </td>
            </tr>

            {/* Staked */}
            <tr style={{ borderTop: '1px solid #1e293b' }}>
              <td style={{ ...col0Style, ...rowPad, background: REWARD_ROW_BG_B }} align="left">
                <button
                  type="button"
                  onClick={onStakedLabelClick}
                  style={{ padding: '5px 5px', fontSize: 10, fontWeight: 600, color: '#ffffff', textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: onStakedLabelClick ? 'pointer' : 'default', background: 'transparent', border: 'none' }}
                  aria-label="Open Staked list"
                  title="Manage SpCoin Staking Contracts."
                >
                  Staked
                </button>
              </td>
              <td style={rowPad} align="left">
                <div style={amountCommon} title={stakedAmountText}>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stakedAmountText}</span>
                </div>
              </td>
              <td style={rowPad} align="center">
                <div
                  style={{ display: 'flex', justifyContent: 'center' }}
                  onMouseEnter={() => setStakedHover(true)}
                  onMouseLeave={() => setStakedHover(false)}
                >
                  <button
                    type="button"
                    style={tradeLoading ? btnOrangePulse : (stakedIsZero ? (stakedHover ? btnRed : btnOrange) : btnGreen)}
                    onClick={() => { if (!tradeLoading && !stakedIsZero) onUnstake?.(); }}
                    onMouseEnter={() => setStakedHover(true)}
                    onMouseLeave={() => setStakedHover(false)}
                    aria-disabled={tradeLoading}
                    aria-label="Unstake All Sponsorships"
                    title={tradeLoading ? 'Loading...' : stakedIsZero ? 'Empty Staking Balance' : 'Unstake All Sponsorships'}
                  >
                    {tradeLoading ? 'Loading...' : stakedIsZero && stakedHover ? 'N/A' : 'Unstake'}
                  </button>
                </div>
              </td>
            </tr>

            {/* Pending (collapsed) row — shown when group is CLOSED */}
            {!showPendingGroup && (
              <tr style={{ borderTop: '1px solid #1e293b' }}>
                <td style={{ ...col0Style, ...rowPad, background: REWARD_ROW_BG_A }} align="left">
                  <button
                    type="button"
                    onClick={pendingRoleUnavailable ? undefined : onPendingEstimate}
                    onContextMenu={(e) => { e.preventDefault(); onOpenPendingGroup?.(); }}
                    disabled={!!pendingInitialLoading}
                    style={{ padding: '5px 5px', fontSize: 10, fontWeight: 600, color: '#ffffff', textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer', background: 'transparent', border: 'none' }}
                    aria-label="Estimate total pending rewards"
                    title="Right Click to Expand"
                  >
                    Pending
                  </button>
                </td>
                <td style={rowPad} align="left">
                  <div style={amountCommon} title={pendingErrorText || pendingAmountText}>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pendingAmountText}</span>
                  </div>
                </td>
                <td style={rowPad} align="center">
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <button
                      type="button"
                      style={
                        pendingInitialLoading
                          ? btnOrangePulse
                          : (pendingRoleUnavailable || pendingIsZero)
                            ? (pendingHover ? btnRed : btnOrange)
                            : btnGreen
                      }
                      onClick={() => { if (!pendingRoleUnavailable && !pendingInitialLoading && !pendingIsZero) onPendingClaim?.(); }}
                      onMouseEnter={() => setPendingHover(true)}
                      onMouseLeave={() => setPendingHover(false)}
                      aria-disabled={!!pendingInitialLoading}
                      disabled={!!pendingClaimDisabled}
                      aria-label="Claim all Sponsorship rewards"
                      title={
                        pendingRoleUnavailable
                          ? 'No Sponsor / Recipient / Agent role for this account'
                          : pendingInitialLoading
                            ? 'Loading...'
                            : pendingIsZero
                              ? 'No Pending Rewards'
                              : 'Claim all Pending Rewards'
                      }
                    >
                      {pendingInitialLoading ? 'Loading...' : pendingClaiming ? '...' : (pendingRoleUnavailable || pendingIsZero) && pendingHover ? 'N/A' : 'Claim'}
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>

          {/* Expanded pending rows — real container for MANAGE_PENDING_REWARDS */}
          {showPendingGroup && (
            <tbody id="MANAGE_PENDING_REWARDS">
              <tr style={{ borderTop: '1px solid #1e293b' }}>
                <td style={{ ...col0Style, ...rowPad, background: REWARD_ROW_BG_A }} align="left">
                  <button
                    type="button"
                    onClick={onPendingHeaderEstimate}
                    onContextMenu={(e) => { e.preventDefault(); onClosePendingGroup?.(); }}
                    style={{ padding: '5px 5px', fontSize: 10, fontWeight: 600, color: '#ffffff', textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer', background: 'transparent', border: 'none' }}
                    aria-label="Estimate pending rewards by account type"
                    title="Left Click to Estimate Roles. Right Click to Collapse"
                  >
                    Pending Rewards by Account Type
                  </button>
                </td>
                <td style={rowPad} align="left" />
                <td style={rowPad} align="center" />
              </tr>

              {rewardRows.map((row, index) => {
                const rowBg = index % 2 === 0 ? REWARD_ROW_BG_B : REWARD_ROW_BG_A;
                const numericAmount = Number(row.amount);
                const isZeroOrEmptyAmount =
                  !!row.available &&
                  (row.amount == null || row.amount === '' || !Number.isFinite(numericAmount) || numericAmount <= 0);
                const claimColor = isZeroOrEmptyAmount ? btnOrange : btnGreen;
                const labelColor = row.available ? '#ffffff' : '#ef4444';
                return (
                  <tr key={row.role} style={{ borderTop: '1px solid #1e293b' }}>
                    <td style={{ ...col0Style, ...rowPad, background: rowBg }} align="left">
                      <button
                        type="button"
                        onClick={row.available && !row.loading ? () => onRoleEstimate?.(row.role) : undefined}
                        disabled={!row.available || row.loading}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4, boxSizing: 'border-box',
                          paddingTop: 1.5, paddingBottom: 1.5, paddingLeft: 12, paddingRight: 5,
                          fontSize: 10, fontWeight: 600, color: labelColor, whiteSpace: 'nowrap',
                          overflow: 'hidden', textOverflow: 'ellipsis', cursor: row.available && !row.loading ? 'pointer' : 'default',
                          background: 'transparent', border: 'none',
                        }}
                        aria-label={`Estimate ${row.role} rewards`}
                        title={row.available ? `Estimate ${row.role} pending rewards` : `${row.role} rewards are not available for this account.`}
                      >
                        <span style={{ fontSize: 8 }}>•</span>
                        {row.role}
                      </button>
                    </td>
                    <td style={rowPad} align="left">
                      <div style={{ ...amountCommon, color: row.available ? '#e2e8f0' : '#ef4444' }} title={row.error || row.amount || undefined}>
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.error ? 'Error' : row.amount}</span>
                      </div>
                    </td>
                    <td style={rowPad} align="center">
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <button
                          type="button"
                          style={claimColor}
                          onClick={() => { if (row.available && !row.loading && !isZeroOrEmptyAmount) onRoleClaim?.(row.role); }}
                          disabled={!row.available || row.loading || isZeroOrEmptyAmount}
                          aria-label={`Claim ${row.role} rewards`}
                          title={
                            !row.available
                              ? `${row.role} rewards are not available for this account.`
                              : isZeroOrEmptyAmount
                                ? `No ${row.role} rewards pending yet.`
                                : `Claim ${row.role} rewards`
                          }
                        >
                          {isZeroOrEmptyAmount ? 'Pending' : 'Claim'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          )}

          {/* Total Coins — spans the Amount+Options columns */}
          <tbody>
            <tr style={{ borderTop: '1px solid #1e293b' }}>
              <td style={{ ...col0Style, ...rowPad, background: totalRowBg }} align="left">
                <div style={{ padding: '5px 5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title="Total Available SpCoins">
                  Total Coins
                </div>
              </td>
              <td colSpan={2} style={rowPad} align="left">
                <div style={amountCommon} title={totalCoinsText}>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{totalCoinsText}</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {todoContent ? <div style={{ zIndex: 2000 }}>{todoContent}</div> : null}
    </div>
  );
}
