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

import React from 'react';
import type { MessageAccountEntry, MessageTokenEntry } from '@sponsorcoin/spcoin-common/context';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { useExchangeContext } from '@sponsorcoin/spcoin-exchange-engine';
import { AccountAvatar, TokenLogo } from '@sponsorcoin/spcoin-panels';
import { MessagePanelReal } from './panels';

const ROLE_TO_MODE: Record<MessageAccountEntry['role'], typeof SP_COIN_DISPLAY.ACTIVE_ACCOUNT | typeof SP_COIN_DISPLAY.SPONSOR_ACCOUNT | typeof SP_COIN_DISPLAY.RECIPIENT_ACCOUNT | typeof SP_COIN_DISPLAY.AGENT_ACCOUNT> = {
  SPONSOR: SP_COIN_DISPLAY.SPONSOR_ACCOUNT,
  RECIPIENT: SP_COIN_DISPLAY.RECIPIENT_ACCOUNT,
  AGENT: SP_COIN_DISPLAY.AGENT_ACCOUNT,
  ACCOUNT: SP_COIN_DISPLAY.ACTIVE_ACCOUNT,
};

function DefaultAccountRow({ entry }: { entry: MessageAccountEntry }) {
  const label = [entry.account.symbol, entry.account.name].filter(Boolean).join(' | ');
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-2">
        <AccountAvatar account={entry.account} mode={ROLE_TO_MODE[entry.role]} roleLabel={entry.role} className="h-8 w-8 rounded-full object-cover" />
        <span className="text-sm">
          <span className="font-semibold">{entry.role}:</span> {label}
        </span>
      </div>
      <div className="pl-10 text-xs opacity-80 break-all">{String(entry.account.address ?? '')}</div>
      {entry.detail && <div className="pl-10 text-xs opacity-80">{entry.detail}</div>}
    </div>
  );
}

/** The web app's MessageTokenRow, unchanged. */
function DefaultTokenRow({ entry }: { entry: MessageTokenEntry }) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2">
        <TokenLogo tokenContract={entry.token} className="h-8 w-8 rounded-full object-contain" />
        <span className="text-sm">
          <span className="font-semibold">{entry.label}:</span>{' '}
          {[entry.token.symbol, entry.token.name].filter(Boolean).join(': ')}
        </span>
      </div>
      {entry.detail && <div className="pl-10 text-xs opacity-80">{entry.detail}</div>}
    </div>
  );
}

export interface ConnectedMessagePanelProps {
  renderAccountRow?: (entry: MessageAccountEntry, index: number) => React.ReactNode;
  renderTokenRow?: (entry: MessageTokenEntry, index: number) => React.ReactNode;
}

export default function ConnectedMessagePanel({ renderAccountRow, renderTokenRow }: ConnectedMessagePanelProps) {
  const { errorMessage } = useExchangeContext();
  return (
    <MessagePanelReal
      errorMessage={errorMessage}
      renderAccountRow={renderAccountRow ?? ((entry, i) => <DefaultAccountRow key={`${entry.role}-${i}`} entry={entry} />)}
      renderTokenRow={renderTokenRow ?? ((entry, i) => <DefaultTokenRow key={`token-${i}`} entry={entry} />)}
    />
  );
}
