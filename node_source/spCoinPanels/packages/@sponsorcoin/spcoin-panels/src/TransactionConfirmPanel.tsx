// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/TransactionConfirmPanel.tsx
//
// 2026-09-22, Phase B.2 Stage 4.c — the real transaction-confirmation
// screen, on request ("do it" after docs/npmMigrationDesign.md's Stage 28
// cross-check confirmed this is the actual next step). This is NOT a
// promotion of the web app's real ProcessFlowPanel.tsx (604 lines) — that
// component's own doc comment records a deliberate 2026-08-20 product
// decision: every Merit-authorized write AUTO-APPROVES with no Reject/
// Approve step unless the account happens to be locked or "Mandatory
// Approval Required" is separately toggled on. Stage 25 (npmMigrationDesign.md)
// already recorded the opposite decision for the extension, confirmed via
// AskUserQuestion: "the extension's 4.c confirmation screen shows
// unconditionally, every write, regardless of lock state or the
// mandatory-approval setting — deliberately stricter than the web app's
// own default." So this is new, real logic, not an extraction.
//
// Also deliberately simpler than ProcessFlowPanel.tsx's own avatar-arrow-
// chain visual (AccountAvatar/MessageAccountRow/AvatarArrowChain) — checked
// each of those directly before writing this: AccountAvatar.tsx pulls in
// useOpenAccountComponent/useWalletAccountsList (real ExchangeContext/
// Merit-wallet-list coupling), and MessageAccountRow.tsx wraps a full
// AccountSelectDropDown — neither portable today, and porting them is a
// separate, bigger scope than "build the confirmation gate" calls for.
// Plain rows (optional logoURL <img>, no click/select behavior) cover the
// real job here — showing a person what they're about to sign — without
// taking on that extra dependency chain.
//
// Data shape intentionally mirrors components/wallet/lib/meritConnect's
// MeritApprovalRequest fields (accounts/tokens/amount/chainId/
// contractAddress/title) that ProcessFlowPanel.tsx already renders, so a
// future caller feeding this from a real request object needs no
// reshaping — same MessageTokenEntry/MessageAmountEntry/MessageAccountEntry-
// shaped data lib/structure/types.ts already defines for ErrorMessage.

'use client';

import React from 'react';

export interface TransactionConfirmAccountEntry {
  role: string;
  address: string;
  symbol?: string;
  name?: string;
  logoURL?: string;
}

export interface TransactionConfirmTokenEntry {
  label: string;
  symbol?: string;
  name?: string;
  address?: string;
  logoURL?: string;
}

export interface TransactionConfirmPanelProps {
  /** e.g. "Approve Swap via Uniswap V3" — matches the real app's own title-bar convention. */
  title: string;
  message?: string;
  accounts?: TransactionConfirmAccountEntry[];
  tokens?: TransactionConfirmTokenEntry[];
  amount?: { label: string; value: string };
  chainId?: number;
  contractAddress?: string;
  /** True once Approve has been clicked and the real write is in flight — disables both buttons, Approve reads "Signing…". */
  busy?: boolean;
  onApprove: () => void;
  onReject: () => void;
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 12,
};

const avatarStyle: React.CSSProperties = {
  height: 28,
  width: 28,
  borderRadius: 6,
  objectFit: 'contain',
  flexShrink: 0,
  background: '#1f2639',
};

function AccountRow({ entry }: { entry: TransactionConfirmAccountEntry }) {
  return (
    <div style={rowStyle}>
      {entry.logoURL ? (
        <img src={entry.logoURL} alt="" style={avatarStyle} />
      ) : (
        <div style={avatarStyle} />
      )}
      <div style={{ minWidth: 0 }}>
        <div style={{ color: '#94a3b8', fontSize: 10 }}>{entry.role}</div>
        <div style={{ color: '#e2e8f0', fontWeight: 600 }}>
          {entry.symbol ?? entry.name ?? entry.address}
        </div>
        {(entry.symbol || entry.name) && (
          <div style={{ color: '#64748b', fontSize: 10, wordBreak: 'break-all' }}>{entry.address}</div>
        )}
      </div>
    </div>
  );
}

function TokenRow({ entry }: { entry: TransactionConfirmTokenEntry }) {
  return (
    <div style={rowStyle}>
      {entry.logoURL ? (
        <img src={entry.logoURL} alt="" style={avatarStyle} />
      ) : (
        <div style={avatarStyle} />
      )}
      <div style={{ minWidth: 0 }}>
        <div style={{ color: '#94a3b8', fontSize: 10 }}>{entry.label}</div>
        <div style={{ color: '#e2e8f0', fontWeight: 600 }}>{entry.symbol ?? entry.name ?? entry.address}</div>
        {entry.address && (entry.symbol || entry.name) && (
          <div style={{ color: '#64748b', fontSize: 10, wordBreak: 'break-all' }}>{entry.address}</div>
        )}
      </div>
    </div>
  );
}

export default function TransactionConfirmPanel({
  title,
  message,
  accounts,
  tokens,
  amount,
  chainId,
  contractAddress,
  busy = false,
  onApprove,
  onReject,
}: TransactionConfirmPanelProps) {
  return (
    <div
      style={{
        boxSizing: 'border-box',
        position: 'absolute',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: 16,
        background: '#11162a',
        overflowY: 'auto',
      }}
    >
      <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#ffffff', textAlign: 'center' }}>{title}</h2>
      {message && (
        <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>{message}</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {accounts?.map((entry, i) => <AccountRow key={`account-${i}`} entry={entry} />)}
        {tokens?.map((entry, i) => <TokenRow key={`token-${i}`} entry={entry} />)}
        {amount && (
          <div style={rowStyle}>
            <span style={{ color: '#94a3b8', minWidth: 60 }}>{amount.label}</span>
            <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{amount.value}</span>
          </div>
        )}
        {typeof chainId === 'number' && (
          <div style={rowStyle}>
            <span style={{ color: '#94a3b8', minWidth: 60 }}>Chain ID</span>
            <span style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>{chainId}</span>
          </div>
        )}
        {contractAddress && (
          <div style={rowStyle}>
            <span style={{ color: '#94a3b8', minWidth: 60 }}>Contract</span>
            <span style={{ color: '#e2e8f0', fontFamily: 'monospace', wordBreak: 'break-all', fontSize: 10 }}>
              {contractAddress}
            </span>
          </div>
        )}
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={onReject}
          disabled={busy}
          style={{
            flex: 1,
            borderRadius: 8,
            border: '1px solid #334155',
            background: 'transparent',
            padding: '10px 0',
            fontSize: 12,
            fontWeight: 600,
            color: '#94a3b8',
            cursor: busy ? 'default' : 'pointer',
            opacity: busy ? 0.5 : 1,
          }}
        >
          Reject
        </button>
        <button
          type="button"
          onClick={onApprove}
          disabled={busy}
          style={{
            flex: 1,
            borderRadius: 8,
            border: 'none',
            background: '#5981F3',
            padding: '10px 0',
            fontSize: 12,
            fontWeight: 600,
            color: '#ffffff',
            cursor: busy ? 'default' : 'pointer',
            opacity: busy ? 0.7 : 1,
          }}
        >
          {busy ? 'Signing…' : 'Approve'}
        </button>
      </div>
    </div>
  );
}
