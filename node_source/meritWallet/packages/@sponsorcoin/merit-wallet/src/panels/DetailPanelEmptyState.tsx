// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/DetailPanelEmptyState.tsx
// Portable placeholder covering SIX panel-tree ids at once: ACCOUNT_PANEL,
// AGENT_PANEL, SPONSOR_PANEL, RECIPIENT_PANEL, TOKEN_PANEL, NETWORK_PANEL
// (2026-09-12). Each real version (AccountPanel/AccountPanelView.tsx,
// AgentPanel/index.tsx, SponsorAccountPanel/index.tsx, RecipientPanel/
// index.tsx, TokenPanel/index.tsx, NetworkPanel/index.tsx) shares the exact
// same shape via AccountDetailPanelShell/AccountDetailEmptyState: when
// nothing is selected (the ONLY reachable state without a live account/
// token/network — the case every other placeholder here is already
// limited to), each shows nothing but this one plain message box. One
// shared component instead of six near-identical copies — placeholders,
// not logic, per explicit instruction.

'use client';

import { walletColors } from '@sponsorcoin/spcoin-common/styles';
import React from 'react';

export interface DetailPanelEmptyStateProps {
  /** e.g. "No active account connected." / "No token contract selected." */
  title: string;
  /** Role word(s), e.g. ["Agent"] or ["Sponsor", "Recipient"] — rendered as
   *  "Select an/a <role> to manage." Omit for ACCOUNT_PANEL's own plain
   *  variant (it has no picker — the active account is just whatever's
   *  connected, not something chosen here). */
  roles?: string[];
}

export default function DetailPanelEmptyState({ title, roles }: DetailPanelEmptyStateProps) {
  return (
    <div style={{ padding: 12, fontSize: 12, color: walletColors.textLight }}>
      <p style={{ margin: '0 0 6px', fontWeight: 600 }}>{title}</p>
      {roles && roles.length > 0 && (
        <p style={{ margin: 0 }}>
          Select {roles.length === 1 ? 'an' : 'a'}{' '}
          {roles.map((role, i) => (
            <React.Fragment key={role}>
              {i > 0 ? (i === roles.length - 1 ? ' or ' : ', ') : ''}
              <strong>{role}</strong>
            </React.Fragment>
          ))}{' '}
          to manage.
        </p>
      )}
    </div>
  );
}
