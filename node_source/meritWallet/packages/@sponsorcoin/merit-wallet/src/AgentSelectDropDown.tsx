// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/AgentSelectDropDown.tsx
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt row 5, S2b-2) -- the agent picker, wired to the exchange engine, written once for both
// hosts. It is a move, not a rewrite, of the web app's node_source/spCoinPanels/AssetSelectDropDowns/AgentSelectDropDown.tsx: the same
// data resolution (useAgentAccount), the same open/close orchestration (useOpenActiveListPanel), the same Sponsor/Recipient/Agent
// mutual-exclusion rule (validateAccount), feeding the portable, hook-free AgentSelectDropDown from @sponsorcoin/spcoin-panels. Only
// engine and package imports are used, so it runs wherever an ExchangeContext provider does: the web app's ExchangeProvider and the
// extension's LiteExchangeProvider.
//
// The one host-specific thing is the avatar. The web app's avatar opens the account panel on click (web-only hooks), so a host that wants
// that passes renderAccountAvatar; without it the package's plain AccountAvatar is used (no click behaviour).
'use client';

import React, { useCallback } from 'react';
import { FEED_TYPE } from '@sponsorcoin/spcoin-common/context';
import type { spCoinAccount } from '@sponsorcoin/spcoin-common/context';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import {
  useExchangeContext,
  usePanelVisible,
  useOpenActiveListPanel,
  useAgentAccount,
  validateAccount,
} from '@sponsorcoin/spcoin-exchange-engine';
import { AccountAvatar, PanelGate } from '@sponsorcoin/spcoin-panels';
import { AgentSelectDropDown as PortableAgentSelectDropDown } from './panels';

export interface ConnectedAgentSelectDropDownProps {
  panelGateId?: SP_COIN_DISPLAY | null;
  label?: string;
  addrPrePostSize?: number;
  /** Host-specific avatar for a selected agent (the web app's opens the account panel on click). Default: the package's plain AccountAvatar. */
  renderAccountAvatar?: (account: spCoinAccount) => React.ReactNode;
}

export default function ConnectedAgentSelectDropDown({
  panelGateId,
  label = 'Select Agent',
  addrPrePostSize = 4,
  renderAccountAvatar,
}: ConnectedAgentSelectDropDownProps) {
  const { exchangeContext } = useExchangeContext();
  const [agentAccount, setAgentAccount] = useAgentAccount();
  const { openActiveListPanel, closeActiveListPanel } = useOpenActiveListPanel();
  const agentListVisible = usePanelVisible(SP_COIN_DISPLAY.REMOTE_ACCOUNT_AGENT_LIST);

  const address = String(agentAccount?.address ?? '');
  // A real account with a deliberately blanked address is the "unselected" placeholder.
  const isUnselected = !!agentAccount && !address;

  const openAgentList = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (agentListVisible) {
        closeActiveListPanel('AgentSelectDropDown:closeAgentList');
        return;
      }

      openActiveListPanel(
        {
          feedType: FEED_TYPE.REMOTE_AGENT_ACCOUNTS,
          onCommit: (asset) => setAgentAccount(asset as spCoinAccount),
          selectOnLogoClick: true,
          validateSelection: (addr) =>
            validateAccount('AGENT', addr, exchangeContext?.apiCoreSyncedMembers?.accounts ?? {}),
        },
        'AgentSelectDropDown:openAgentList',
        SP_COIN_DISPLAY.REMOTE_ACCOUNT_AGENT_LIST,
      );
    },
    [agentListVisible, openActiveListPanel, closeActiveListPanel, setAgentAccount, exchangeContext?.apiCoreSyncedMembers?.accounts],
  );

  return (
    <PortableAgentSelectDropDown
      // No agent (never selected, or selection cleared) falls through to the portable component's shared Anonymous avatar.
      icon={
        agentAccount && !isUnselected
          ? (renderAccountAvatar
              ? renderAccountAvatar(agentAccount)
              : <AccountAvatar account={agentAccount} mode={SP_COIN_DISPLAY.AGENT_ACCOUNT} className="h-full w-full object-cover" roleLabel="AGENT" />)
          : undefined
      }
      address={isUnselected ? undefined : address || undefined}
      symbol={isUnselected ? undefined : agentAccount?.symbol}
      placeholderLabel={label}
      onSelectClick={openAgentList}
      listOpen={agentListVisible}
      addrPrePostSize={addrPrePostSize}
      panelGateId={panelGateId === null ? undefined : (panelGateId ?? SP_COIN_DISPLAY.AGENT_SELECT_DROP_DOWN)}
      panelGate={panelGateId === null ? undefined : PanelGate}
    />
  );
}
