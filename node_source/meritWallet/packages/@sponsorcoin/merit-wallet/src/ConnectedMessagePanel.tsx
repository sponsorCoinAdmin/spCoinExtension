// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/ConnectedMessagePanel.tsx
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt, row 8 / S2b-4b) -- the message panel (MESSAGE_PANEL), wired to the exchange engine, written
// once for both hosts. The card itself is spcoin-panels' MessagePanelReal; what the web app's components/views/MessagePanel.tsx added was
// reading the current error message from the exchange context and filling the account / token row slots. This is that wiring, moved: the
// message comes from the engine's useExchangeContext (the same field the web hook useErrorMessage reads; the hook's only extras were a
// dedupe on write and a debug trace, neither used by a reader).
//
// Rows: a host may pass its own renderers (the web app passes rows built on its click-through account pill and token logo). Without them
// the package renders plain rows: the token row is the web app's MessageTokenRow, unchanged (it only uses the package TokenLogo); the
// account row is a simple avatar + "ROLE: symbol | name" + address line, since the web pill's click behaviour is web-only.
'use client';

import { messageRowStyle } from '@sponsorcoin/spcoin-common/styles';
import React, { useSyncExternalStore } from 'react';
import type { MessageAccountEntry, MessageTokenEntry } from '@sponsorcoin/spcoin-common/context';
import { useExchangeContext, stepPanelContentStore } from '@sponsorcoin/spcoin-exchange-engine';
import { MessageAccountRow, TokenLogo } from '@sponsorcoin/spcoin-panels';
import { MessagePanelReal } from './panels';
import { pendingApprovalMessageStore } from './approval/pendingApprovalMessageStore';

/** The web app's MessageTokenRow, unchanged. */
function DefaultTokenRow({ entry }: { entry: MessageTokenEntry }) {
  return (
    <div style={messageRowStyle.tokenColumn}>
      <div style={messageRowStyle.line}>
        <TokenLogo tokenContract={entry.token} className="" style={messageRowStyle.tokenLogo} />
        <span style={messageRowStyle.label}>
          <span style={messageRowStyle.role}>{entry.label}:</span>{' '}
          {[entry.token.symbol, entry.token.name].filter(Boolean).join(': ')}
        </span>
      </div>
      {entry.detail && <div style={messageRowStyle.detail}>{entry.detail}</div>}
    </div>
  );
}

export interface ConnectedMessagePanelProps {
  renderAccountRow?: (entry: MessageAccountEntry, index: number) => React.ReactNode;
  renderTokenRow?: (entry: MessageTokenEntry, index: number) => React.ReactNode;
}

export default function ConnectedMessagePanel({ renderAccountRow, renderTokenRow }: ConnectedMessagePanelProps) {
  const { errorMessage } = useExchangeContext();
  // 2026-10-29: present only while a Merit-authorized write is waiting on a person —
  // useMeritApprovalMessagePanel.ts (mounted once in MeritWallet.tsx) publishes it here rather
  // than as a prop, since this component is mounted in more than one place — see that store's own
  // doc comment for why.
  const pendingApproval = useSyncExternalStore(
    pendingApprovalMessageStore.subscribe,
    pendingApprovalMessageStore.getSnapshot,
    pendingApprovalMessageStore.getServerSnapshot,
  );
  // A step-through popup published for MESSAGE_PANEL (the Swap tab's Steps flow) replaces the normal message while it is up.
  const stepContent = useSyncExternalStore(stepPanelContentStore.subscribe, stepPanelContentStore.getSnapshot, stepPanelContentStore.getServerSnapshot);
  // A write waiting on a person (Approve / Reject, the password) always comes first: the step popup returns once it is answered.
  if (stepContent && !pendingApproval) return <div style={{ padding: '0 8px 8px' }}>{stepContent as React.ReactNode}</div>;
  return (
    <MessagePanelReal
      errorMessage={errorMessage}
      renderAccountRow={renderAccountRow ?? ((entry, i) => <MessageAccountRow key={`${entry.role}-${i}`} entry={entry} />)}
      renderTokenRow={renderTokenRow ?? ((entry, i) => <DefaultTokenRow key={`token-${i}`} entry={entry} />)}
      pendingApproval={pendingApproval}
    />
  );
}
