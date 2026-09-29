// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/AccountListRewardsPanel.tsx
// Portable shell for ACCOUNT_LIST_REWARDS_PANEL (31) — promoted from the web
// app's components/views/RadioOverlayPanels/AccountListRewardsPanel/index.tsx
// (543 ln). Non-portable pieces — every Tailwind className (this package has
// no Tailwind pipeline), next/image (web app only), AddressSelect (web app,
// wraps useExchangeContext), useOpenAccountComponent / ExchangeContext
// role-account writes, the ToDo debug overlay — all stay in the web-app
// wrapper and are fed in as opaque slots/callbacks, same "opaque-slot split"
// shape as StakingControllerPanel / ManageSponsorshipsPanel this session.
//
// What moved here: the PanelGate-visibility reads (via usePanelVisible from
// @sponsorcoin/spcoin-exchange-engine, the same shared singleton panelStore
// every other package component reads), the listType / accountType /
// accountRole derivation logic, the chevron open/close state machine
// (useState + localStorage, same keys), the container layout, the table
// structure, the per-row AccountCell / RewardsSubTable / TotalRow rendering —
// pixel-identical structure to the real web app version, expressed in inline
// styles (colors/spacing copied from the real msTableTw and constants.ts so
// the extension renders the same table it always did).
//
// 2026-09-24, on request ("migrate ACCOUNT_LIST_REWARDS_PANEL"): the real
// component is large and tightly coupled to ExchangeContext, but the only
// things that have to move are the layout + visibility + derivation — every
// data-dependent and web-only surface stays in the wrapper via props.

'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { AccountType, type spCoinAccount } from '@sponsorcoin/spcoin-common/context';
import { usePanelVisible, usePanelTree } from '@sponsorcoin/spcoin-exchange-engine';
import { PACKAGE_BUILD } from './packageBuildTag';
import TabBodyMarker from './TabBodyMarker';
import { REWARD_ROW_BG_A, REWARD_ROW_BG_B } from './RewardRow';

export type AccountListRewardsRole = 'sponsor' | 'recipient' | 'agent' | 'unknown';

export type AccountListRewardsCellSlot = React.FC<{
  account: spCoinAccount;
  addressText: string;
  roleLabel: string;
  onRowEnter: (name?: string | null) => void;
  onRowMove: React.MouseEventHandler;
  onRowLeave: () => void;
  onPick: (account: spCoinAccount) => void;
}>;

export interface AccountListRewardsPanelProps {
  accountList: spCoinAccount[];
  setAccountCallBack: (account?: spCoinAccount) => void;
  panelId?: SP_COIN_DISPLAY;
  chevronPanelId?: SP_COIN_DISPLAY;
  containerType?: SP_COIN_DISPLAY;

  addressSelectContent?: React.ReactNode;
  todoContent?: React.ReactNode;
  accountCellSlot?: AccountListRewardsCellSlot;

  onPickAccount?: (account: spCoinAccount, roleLabel: string) => void;
  onClaimRewards?: (type: AccountType, accountId: number, label?: string) => void;

  chevronOpenOverride?: boolean;
  onChevronToggle?: (open: boolean) => void;
}

const LS_CHEVRON_OPEN_KEY = 'spcoin:chevron_down_open_pending';
void roleLabelToRoleKind;

const EMPTY_SUBROWS = Object.freeze({});

const col0Width = 88;
const rowPad: React.CSSProperties = { paddingTop: 2, paddingBottom: 2 };
const headerPad: React.CSSProperties = { paddingTop: 6, paddingBottom: 6 };
const col0Style: React.CSSProperties = { width: col0Width, minWidth: col0Width, maxWidth: col0Width };

const amountCommon: React.CSSProperties = {
  fontSize: 13,
  color: '#e2e8f0',
  opacity: 0.8,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const btnGreen: React.CSSProperties = {
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
  background: '#147f3b',
  color: '#ffffff',
  cursor: 'pointer',
};

const chevronBtnBase: React.CSSProperties = {
  margin: 0,
  padding: 0,
  borderRadius: 6,
  width: 21,
  height: 21,
  border: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
};

const tipStyle: React.CSSProperties = {
  position: 'fixed',
  zIndex: 9999,
  pointerEvents: 'none',
  background: '#ffffff',
  color: '#000000',
  padding: '6px 10px',
  borderRadius: 6,
  fontSize: 12,
  lineHeight: 1.2,
  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
  maxWidth: 260,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

function isPendingPanel(p: SP_COIN_DISPLAY) {
  return (
    p === SP_COIN_DISPLAY.PENDING_SPONSOR_REWARDS ||
    p === SP_COIN_DISPLAY.PENDING_RECIPIENT_REWARDS ||
    p === SP_COIN_DISPLAY.PENDING_AGENT_REWARDS
  );
}

function roleLabelToRoleKind(roleLabel: string): AccountListRewardsRole {
  const s = (roleLabel ?? '').toString().trim().toLowerCase();
  if (s === 'recipient') return 'recipient';
  if (s === 'agent') return 'agent';
  if (s === 'sponsor') return 'sponsor';
  return 'unknown';
}

function getRowLabelTitle(label: string): string {
  if (label === 'Staked') return 'Staked SpCoin Quantity';
  if (label === 'Sponsor') return 'Pending Sponsor SpCoin Rewards';
  if (label === 'Recipient') return 'Pending Recipient SpCoin Rewards';
  if (label === 'Agent') return 'Pending Agent SpCoin Rewards';
  return '';
}

function getAddressText(w: any): string {
  if (typeof w?.address === 'string') return w.address;
  const a = w?.address as Record<string, unknown> | undefined;
  if (!a) return 'N/A';
  const cand = a.address ?? a.hex ?? a.bech32 ?? a.value ?? a.id;
  try {
    return cand ? String(cand) : JSON.stringify(a);
  } catch {
    return 'N/A';
  }
}

function getActionButtonAriaLabel(buttonText: string, label: string): string {
  if (buttonText === 'Claim' && label === 'Sponsor')
    return 'Claim Sponsor SpCoin Pending Rewards';
  if (buttonText === 'Claim' && label === 'Recipient')
    return 'Claim Recipient SpCoin Pending Rewards';
  if (buttonText === 'Claim' && label === 'Agent')
    return 'Claim Agent SpCoin Pending Rewards';
  if (buttonText === 'Unstake' && label === 'Staked') return 'Unstake SpCoins';
  return `${buttonText} ${label}`;
}

function getClaimRowFgColor(
  label: string,
  cfgClaimSponsor: boolean,
  cfgClaimAgent: boolean,
  cfgClaimRecipient: boolean,
): string {
  const LIGHT_GREEN = '#4ade80';
  if (cfgClaimSponsor && (label === 'Sponsor' || label === 'Staked')) return LIGHT_GREEN;
  if (!cfgClaimSponsor && cfgClaimAgent && label === 'Agent') return LIGHT_GREEN;
  if (!cfgClaimSponsor && !cfgClaimAgent && cfgClaimRecipient && label === 'Recipient') return LIGHT_GREEN;
  return '#ffffff';
}

function ExpandRow({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateRows: open ? '1fr' : '0fr',
        opacity: open ? 1 : 0,
        transform: open ? 'translateY(0)' : 'translateY(-4px)',
        transition: 'grid-template-rows 200ms ease-out, opacity 200ms ease-out, transform 200ms ease-out',
      }}
    >
      <div style={{ overflow: 'hidden' }}>{children}</div>
    </div>
  );
}

function DefaultAccountCellImpl({
  account,
  roleLabel,
  addressText,
  onPick,
  onRowEnter,
  onRowMove,
  onRowLeave,
}: {
  account: spCoinAccount;
  roleLabel: string;
  addressText: string;
  onPick: (a: spCoinAccount) => void;
  onRowEnter: (name?: string | null) => void;
  onRowMove: React.MouseEventHandler;
  onRowLeave: () => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
      <button
        type="button"
        style={{ background: 'transparent', padding: 0, margin: 0, cursor: 'pointer' }}
        onMouseEnter={() => onRowEnter(account?.name ?? '')}
        onMouseMove={onRowMove}
        onMouseLeave={onRowLeave}
        onClick={() => onPick(account)}
        aria-label={`Open ${roleLabel}s reconfigure`}
        data-role={roleLabel}
        data-address={addressText}
      >
        <img
          src={(account as any)?.logoURL || '/assets/miscellaneous/placeholder.png'}
          alt={`${account?.name ?? 'Wallet'} logo`}
          title={`${roleLabel} ${account?.name ?? 'Unknown'} Account Details`}
          width={38}
          height={38}
          style={{ width: 38, height: 38, objectFit: 'contain', background: 'transparent' }}
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

function AccountCellImpl({
  account,
  roleLabel,
  addressText,
  onPick,
  onRowEnter,
  onRowMove,
  onRowLeave,
  accountCellSlot,
}: {
  account: spCoinAccount;
  roleLabel: string;
  addressText: string;
  onPick: (a: spCoinAccount) => void;
  onRowEnter: (name?: string | null) => void;
  onRowMove: React.MouseEventHandler;
  onRowLeave: () => void;
  accountCellSlot?: AccountListRewardsCellSlot;
}) {
  const Impl = accountCellSlot ?? DefaultAccountCellImpl;
  return (
    <Impl
      account={account}
      roleLabel={roleLabel}
      addressText={addressText}
      onPick={onPick}
      onRowEnter={onRowEnter}
      onRowMove={onRowMove}
      onRowLeave={onRowLeave}
    />
  );
}

function RewardsSubTable({
  zebra,
  walletKey,
  walletIndex,
  tokenRowVisible,
  showRow3,
  showRow4,
  showRow5,
  rewardsOpen,
  showRewardsRow,
  showUnSponsorRow,
  isSponsorMode,
  cfgClaimSponsor,
  cfgClaimAgent,
  cfgClaimRecipient,
  onSetWalletRows3to5Open,
  onClaim,
}: {
  zebra: string;
  walletKey: string;
  walletIndex: number;
  tokenRowVisible: boolean;
  showRow3: boolean;
  showRow4: boolean;
  showRow5: boolean;
  rewardsOpen: boolean;
  showRewardsRow: boolean;
  showUnSponsorRow: boolean;
  isSponsorMode: boolean;
  cfgClaimSponsor: boolean;
  cfgClaimAgent: boolean;
  cfgClaimRecipient: boolean;
  onSetWalletRows3to5Open: (walletKey: string, open: boolean) => void;
  onClaim: (type: AccountType, accountId: number, label?: string) => void;
}) {
  const rewardsDetailsTitle = tokenRowVisible
    ? 'Hide Rewards Contract Details'
    : 'Show Rewards Contract Details';
  const stakedDetailsTitle = tokenRowVisible
    ? 'Hide Staked Contract Details'
    : 'Show Staked Contract Details';

  const toggleRows3to5 = useCallback(() => {
    onSetWalletRows3to5Open(walletKey, !rewardsOpen);
  }, [onSetWalletRows3to5Open, walletKey, rewardsOpen]);

  const stakedOpen = showUnSponsorRow;

  function renderNestedRewardsRow() {
    if (!showRewardsRow) return null;

    return (
      <tr aria-hidden={false}>
        <td colSpan={2} style={{ padding: 0 }} title="Pending SpCoin Rewards">
          <ExpandRow open={true}>
            <div style={{ minHeight: 34, paddingTop: 2, paddingBottom: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  onClick={toggleRows3to5}
                  style={{ fontSize: 13, cursor: 'pointer', textAlign: 'left', paddingLeft: 10, color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', border: 'none', background: 'transparent' }}
                  aria-label={rewardsDetailsTitle}
                  title={rewardsDetailsTitle}
                >
                  Rewards
                </button>
                <div style={{ ...amountCommon, minWidth: 0 }} title="0.0">0.0</div>
              </div>
              <button
                type="button"
                style={btnGreen}
                aria-label="Claim SpCoin Rewards"
                title="Claim SpCoin Rewards"
                onClick={() => onClaim(AccountType.ALL, walletIndex, 'Rewards')}
              >
                Claim
              </button>
            </div>
          </ExpandRow>
        </td>
      </tr>
    );
  }

  function renderNestedTokenContractRow(open: boolean) {
    return (
      <tr aria-hidden={!open}>
        <td colSpan={2} style={{ padding: 0 }}>
          <ExpandRow open={open}>
            <div style={{ minHeight: 34, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '100%', textAlign: 'center', fontSize: 14.3, lineHeight: 1.15, color: '#5981F3' }}>
                Sponsor Coin Contract Rewards Details
              </div>
            </div>
          </ExpandRow>
        </td>
      </tr>
    );
  }

  function renderNestedClaimRow(open: boolean, label: string, valueText: string, type: AccountType) {
    const isUnstakeRow = label === 'Staked';
    const buttonText = 'Unstake';
    const showButton = isUnstakeRow ? isSponsorMode : false;
    const actionText = getActionButtonAriaLabel(buttonText, label);
    const labelTitle = getRowLabelTitle(label);
    const fgColor = getClaimRowFgColor(label, cfgClaimSponsor, cfgClaimAgent, cfgClaimRecipient);

    if (!isUnstakeRow) {
      const isIndentedLabel = label === 'Sponsor' || label === 'Recipient' || label === 'Agent';
      return (
        <tr aria-hidden={!open}>
          <td colSpan={2} style={{ padding: 0, color: fgColor }} title={labelTitle}>
            <ExpandRow open={open}>
              <div style={{ minHeight: 34, paddingTop: 2, paddingBottom: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
                  {!isIndentedLabel && (
                    <button type="button" style={{ margin: 0, padding: 0, borderRadius: 6, width: 21, height: 21, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', visibility: 'hidden', outline: 'none', background: 'transparent', cursor: 'default' }} aria-hidden="true" tabIndex={-1} />
                  )}
                  <div style={{ width: col0Width, visibility: 'hidden' }} aria-hidden="true" />
                  <div style={{ ...amountCommon, minWidth: 0 }}>{valueText}</div>
                  {isIndentedLabel ? (
                    <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                      <div style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: col0Width }}>{label}</div>
                    </div>
                  ) : null}
                </div>
                <div style={{ flexShrink: 0 }} />
              </div>
            </ExpandRow>
          </td>
        </tr>
      );
    }

    return (
      <tr aria-hidden={!open}>
        <td colSpan={2} style={{ padding: 0 }} title={labelTitle}>
          <ExpandRow open={open}>
            <div style={{ minHeight: 34, paddingTop: 2, paddingBottom: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, color: fgColor }}>
                <button
                  type="button"
                  onClick={toggleRows3to5}
                  style={{ fontSize: 13, cursor: 'pointer', textAlign: 'left', paddingLeft: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', border: 'none', background: 'transparent' }}
                  aria-label={label === 'Staked' ? stakedDetailsTitle : rewardsDetailsTitle}
                  title={label === 'Staked' ? stakedDetailsTitle : rewardsDetailsTitle}
                >
                  {label}
                </button>
                <div style={{ ...amountCommon, minWidth: 0 }}>{valueText}</div>
              </div>
              <button
                type="button"
                style={{ ...btnGreen, visibility: showButton ? 'visible' : 'hidden' }}
                aria-label={actionText}
                title={actionText}
                onClick={() => {
                  if (!showButton) return;
                  onClaim(type, walletIndex, label);
                }}
              >
                {buttonText}
              </button>
            </div>
          </ExpandRow>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td colSpan={2} style={{ background: zebra, padding: 0, verticalAlign: 'top' }}>
        <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
          <colgroup>
            <col style={{ width: col0Width }} />
            <col />
          </colgroup>
          <tbody>
            {renderNestedRewardsRow()}
            {renderNestedClaimRow(stakedOpen, 'Staked', '0.0', AccountType.SPONSOR)}
            {renderNestedTokenContractRow(tokenRowVisible)}
            {renderNestedClaimRow(showRow3, 'Sponsor', '0.0', AccountType.SPONSOR)}
            {renderNestedClaimRow(showRow4, 'Recipient', '0.0', AccountType.RECIPIENT)}
            {renderNestedClaimRow(showRow5, 'Agent', '0.0', AccountType.AGENT)}
          </tbody>
        </table>
      </td>
    </tr>
  );
}

function TotalRow({
  zebra,
  actionButtonText,
  accountType,
  onClaim,
}: {
  zebra: string;
  actionButtonText: string;
  accountType: AccountType;
  onClaim: (type: AccountType, accountId: number, label?: string) => void;
}) {
  return (
    <tr id="REWARDS_TABLE_TOTAL" style={{ borderBottom: '1px solid #000000' }}>
      <td colSpan={2} style={{ background: zebra, padding: 0 }}>
        <div style={{ minHeight: 34, paddingTop: 2, paddingBottom: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
            <button
              type="button"
              style={{ margin: 0, padding: 0, borderRadius: 6, width: 21, height: 21, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', visibility: 'hidden', outline: 'none', background: '#f59e0b', cursor: 'default' }}
              aria-hidden="true"
              tabIndex={-1}
            >
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15l-6-6-6 6"></polyline></svg>
            </button>
            <div style={{ width: col0Width, visibility: 'hidden' }} />
            <div style={{ ...amountCommon, minWidth: 0 }}>0.0</div>
            <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <div style={{ fontSize: 19.5, lineHeight: 1.15, whiteSpace: 'nowrap', width: col0Width }}>Total</div>
            </div>
          </div>
          <button
            type="button"
            style={btnGreen}
            aria-label={`${actionButtonText} total`}
            onClick={() => onClaim(accountType, -1, `${actionButtonText} (TOTAL)`)}
          >
            {actionButtonText}
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function AccountListRewardsPanel({
  accountList,
  setAccountCallBack,
  panelId = SP_COIN_DISPLAY.ACCOUNT_LIST_REWARDS_PANEL,
  chevronPanelId = SP_COIN_DISPLAY.CHEVRON_DOWN_OPEN_PENDING,
  containerType,
  addressSelectContent,
  todoContent,
  accountCellSlot,
  onPickAccount,
  onClaimRewards,
  chevronOpenOverride,
  onChevronToggle,
}: AccountListRewardsPanelProps) {
  const cfgClaimAgent = usePanelVisible(SP_COIN_DISPLAY.PENDING_AGENT_REWARDS);
  const cfgClaimRecipient = usePanelVisible(SP_COIN_DISPLAY.PENDING_RECIPIENT_REWARDS);
  const cfgClaimSponsor = usePanelVisible(SP_COIN_DISPLAY.PENDING_SPONSOR_REWARDS);
  const showUnSponsorRow = usePanelVisible(SP_COIN_DISPLAY.ACTIVE_SPONSORSHIPS);
  const cfgChevronOpen = usePanelVisible(chevronPanelId);

  const { setPanelVisible } = usePanelTree();

  const [localChevronOpen, setLocalChevronOpen] = useState(false);
  const didHydrateChevronRef = useRef(false);

  useEffect(() => {
    setLocalChevronOpen(cfgChevronOpen);

    if (didHydrateChevronRef.current) return;
    didHydrateChevronRef.current = true;

    const lsOpen = localStorage.getItem(LS_CHEVRON_OPEN_KEY);
    const hasLs = lsOpen === 'true' || lsOpen === 'false';
    if (!hasLs) return;

    const resolvedOpen = lsOpen === 'true';
    setLocalChevronOpen(resolvedOpen);
    setPanelVisible(chevronPanelId, resolvedOpen, 'AccountListRewardsPanel:hydrateChevron');
  }, [cfgChevronOpen, chevronPanelId]);

  const effectiveChevronOpen =
    chevronOpenOverride !== undefined ? chevronOpenOverride : (cfgChevronOpen || localChevronOpen);

  const handleChevronToggle = useCallback(
    (open: boolean) => {
      setLocalChevronOpen(open);
      localStorage.setItem(LS_CHEVRON_OPEN_KEY, String(open));
      setPanelVisible(chevronPanelId, open, 'AccountListRewardsPanel:toggleChevron');
      onChevronToggle?.(open);
    },
    [chevronPanelId, onChevronToggle],
  );

  const listType: SP_COIN_DISPLAY = (() => {
    if (showUnSponsorRow) return SP_COIN_DISPLAY.ACTIVE_SPONSORSHIPS;
    if (cfgClaimSponsor) return SP_COIN_DISPLAY.PENDING_SPONSOR_REWARDS;
    if (cfgClaimRecipient) return SP_COIN_DISPLAY.PENDING_RECIPIENT_REWARDS;
    if (cfgClaimAgent) return SP_COIN_DISPLAY.PENDING_AGENT_REWARDS;
    return SP_COIN_DISPLAY.ACCOUNT_LIST_REWARDS_PANEL;
  })();

  const { vAgents, vRecipients } = (() => {
    if (cfgClaimAgent) return { vAgents: true, vRecipients: false };
    if (cfgClaimRecipient) return { vAgents: false, vRecipients: true };
    if (cfgClaimSponsor || showUnSponsorRow)
      return { vAgents: false, vRecipients: false };
    return { vAgents: false, vRecipients: false };
  })();

  const accountType = vAgents ? AccountType.AGENT : vRecipients ? AccountType.RECIPIENT : AccountType.SPONSOR;

  const { accountRole1, accountRole2 } = (() => {
    if (cfgClaimSponsor) return { accountRole1: 'Agent', accountRole2: 'Recipient' };
    if (cfgClaimRecipient) return { accountRole1: 'Sponsor', accountRole2: 'Agent' };
    if (cfgClaimAgent) return { accountRole1: 'Sponsor', accountRole2: 'Recipient' };
    return { accountRole1: 'Accounts', accountRole2: 'Accounts' };
  })();

  const showRewardsRow = cfgClaimSponsor || cfgClaimRecipient || cfgClaimAgent;
  const isSponsorMode = showUnSponsorRow || cfgClaimSponsor;

  const [openByWalletKey, setOpenByWalletKey] = useState<Record<string, any>>({});
  const [showToDo, setShowToDo] = useState(false);
  void openByWalletKey;
  const [tip, setTip] = useState<{ show: boolean; text: string; x: number; y: number }>({
    show: false, text: '', x: 0, y: 0,
  });

  void setAccountCallBack;
  void containerType;

  const claimRewards = useCallback(
    (type: AccountType, accountId: number, label?: string) => {
      setShowToDo(true);
      onClaimRewards?.(type, accountId, label);
    },
    [onClaimRewards],
  );

  const doToDo = useCallback(() => {
    setShowToDo(false);
  }, []);

  const setWalletRows3to5Open = useCallback((walletKey: string, open: boolean) => {
    setOpenByWalletKey((prev) => {
      const cur = prev[walletKey] ?? EMPTY_SUBROWS;
      const nextForKey: any = { ...cur, sponsor: open, recipient: open, agent: open, staked: open };
      return { ...prev, [walletKey]: nextForKey };
    });
  }, []);

  const actionButtonLabel =
    listType === SP_COIN_DISPLAY.ACTIVE_SPONSORSHIPS
      ? 'Unsponsor'
      : isPendingPanel(listType)
        ? 'Claim'
        : 'Action';
  const actionButtonText = actionButtonLabel === 'Claim' ? 'Claim All' : actionButtonLabel;

  const onRowEnter = (name?: string | null) => setTip((t) => ({ ...t, show: true, text: name ?? '' }));
  const onRowMove: React.MouseEventHandler = (e) =>
    setTip((t) => ({ ...t, x: e.clientX, y: e.clientY }));
  const onRowLeave = () => setTip((t) => ({ ...t, show: false }));

  const handlePickForRole = useCallback(
    (roleLabel: string, picked?: spCoinAccount) => {
      onPickAccount?.(picked as spCoinAccount, roleLabel);
      try {
        setAccountCallBack?.(picked);
      } catch {}
    },
    [onPickAccount, setAccountCallBack],
  );

  return (
    <>
      <TabBodyMarker path="AccountListRewardsPanel.tsx" build={PACKAGE_BUILD} />

      {addressSelectContent ? <div style={{ flexShrink: 0 }}>{addressSelectContent}</div> : null}

      {tip.show && tip.text ? (
        <div
          style={{ ...tipStyle, left: tip.x, top: tip.y, transform: 'translate(-50%, -120%)' }}
        >
          {tip.text}
        </div>
      ) : null}

      <div
        id={SP_COIN_DISPLAY[panelId]}
        style={{
          flex: 1,
          minHeight: 0,
          overflowX: 'auto',
          overflowY: 'auto',
          borderRadius: 8,
          border: '1px solid #000000',
          marginTop: 0,
          marginBottom: 0,
        }}
        data-list-type={SP_COIN_DISPLAY[listType]}
      >
        {listType === SP_COIN_DISPLAY.ACTIVE_SPONSORSHIPS && (
          <div id="ACTIVE_SPONSORSHIPS" className="hidden" aria-hidden="true" />
        )}
        {listType === SP_COIN_DISPLAY.PENDING_SPONSOR_REWARDS && (
          <div id="PENDING_SPONSOR_REWARDS" className="hidden" aria-hidden="true" />
        )}
        {listType === SP_COIN_DISPLAY.PENDING_RECIPIENT_REWARDS && (
          <div id="PENDING_RECIPIENT_REWARDS" className="hidden" aria-hidden="true" />
        )}
        {listType === SP_COIN_DISPLAY.PENDING_AGENT_REWARDS && (
          <div id="PENDING_AGENT_REWARDS" className="hidden" aria-hidden="true" />
        )}
        {cfgChevronOpen && (
          <div id="CHEVRON_DOWN_OPEN_PENDING" className="hidden" aria-hidden="true" />
        )}
        <table id="ACCOUNT_LIST_REWARDS_TABLE" style={{ minWidth: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr style={{ background: '#2b2b2b', borderBottom: '1px solid #000000' }}>
              <th
                scope="col"
                style={{ width: '50%', ...col0Style, ...headerPad, textAlign: 'left' }}
              >
                <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    style={{
                      ...chevronBtnBase,
                      background: effectiveChevronOpen ? '#f59e0b' : '#2563eb',
                    }}
                    aria-label={
                      effectiveChevronOpen
                        ? 'Chevron Up (Close all wallet rows)'
                        : 'Chevron Down (Open all Sponsorship Account Rows)'
                    }
                    title={effectiveChevronOpen ? 'Close all wallet rows' : 'Open all account rows'}
                    onClick={() => handleChevronToggle(!effectiveChevronOpen)}
                  >
                    {effectiveChevronOpen ? (
                      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15l-6-6-6 6"></polyline></svg>
                    ) : (
                      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9l6 6 6-6"></polyline></svg>
                    )}
                  </button>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{accountRole1}</span>
                </div>
              </th>
              <th
                scope="col"
                style={{ width: '50%', ...headerPad, textAlign: 'left' }}
              >
                {accountRole2}
              </th>
            </tr>
          </thead>

          <tbody>
            {accountList.map((w: spCoinAccount, i: number) => {
              const zebra = i % 2 === 0 ? REWARD_ROW_BG_A : REWARD_ROW_BG_B;
              const addressText = getAddressText(w);
              const walletKey = String((w as any)?.id ?? addressText ?? i);
              const stableKey = (w as any)?.id ?? `${i}-${addressText}`;

              const revIndex = accountList.length - 1 - i;
              const rw = accountList[revIndex] as spCoinAccount;
              const rwAddressText = getAddressText(rw);

              return (
                <React.Fragment key={stableKey}>
                  <tr style={{ borderBottom: '1px solid #000000' }}>
                    <td style={{ width: '50%', background: zebra, ...rowPad, paddingLeft: 0, verticalAlign: 'middle' }}>
                      <AccountCellImpl
                        account={w}
                        roleLabel={accountRole1}
                        addressText={addressText}
                        onPick={(picked?: spCoinAccount) => handlePickForRole(accountRole1, picked)}
                        onRowEnter={onRowEnter}
                        onRowMove={onRowMove}
                        onRowLeave={onRowLeave}
                        accountCellSlot={accountCellSlot}
                      />
                    </td>
                    <td style={{ width: '50%', background: zebra, ...rowPad, paddingLeft: 0, verticalAlign: 'middle' }}>
                      <AccountCellImpl
                        account={rw}
                        roleLabel={accountRole2}
                        addressText={rwAddressText}
                        onPick={(picked?: spCoinAccount) => handlePickForRole(accountRole2, picked)}
                        onRowEnter={onRowEnter}
                        onRowMove={onRowMove}
                        onRowLeave={onRowLeave}
                        accountCellSlot={accountCellSlot}
                      />
                    </td>
                  </tr>

                  <RewardsSubTable
                    zebra={zebra}
                    walletKey={walletKey}
                    walletIndex={i}
                    tokenRowVisible={!!effectiveChevronOpen}
                    showRow3={!!effectiveChevronOpen}
                    showRow4={!!effectiveChevronOpen}
                    showRow5={!!effectiveChevronOpen}
                    rewardsOpen={!!effectiveChevronOpen}
                    showRewardsRow={showRewardsRow}
                    showUnSponsorRow={showUnSponsorRow}
                    isSponsorMode={isSponsorMode}
                    cfgClaimSponsor={cfgClaimSponsor}
                    cfgClaimAgent={cfgClaimAgent}
                    cfgClaimRecipient={cfgClaimRecipient}
                    onSetWalletRows3to5Open={setWalletRows3to5Open}
                    onClaim={claimRewards}
                  />
                </React.Fragment>
              );
            })}

            <TotalRow
              zebra={accountList.length % 2 === 0 ? REWARD_ROW_BG_A : REWARD_ROW_BG_B}
              actionButtonText={actionButtonText}
              accountType={accountType}
              onClaim={claimRewards}
            />
          </tbody>
        </table>
      </div>

      {showToDo && (
        <div style={{ zIndex: 2000 }} onClick={doToDo}>
          {todoContent ?? <ToDoPlaceholder />}
        </div>
      )}
    </>
  );
}

function ToDoPlaceholder() {
  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'rgba(255, 26, 26, 0.5)',
        color: '#ffffff',
        padding: '8px 16px',
        borderRadius: 8,
        zIndex: 2000,
        fontSize: 12,
        cursor: 'pointer',
      }}
    >
      ToDo
    </div>
  );
}
