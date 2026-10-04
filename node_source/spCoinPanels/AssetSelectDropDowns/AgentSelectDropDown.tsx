// File: node_source/spCoinPanels/AssetSelectDropDowns/AgentSelectDropDown.tsx
'use client';

import React, { useCallback } from 'react';
import type { spCoinAccount } from '@/lib/structure';
import { FEED_TYPE, SP_COIN_DISPLAY } from '@/lib/structure';
// Merit-exclusive (2026-09-04, part of the real split, on request) —
// nested under TradingStationPanel, Merit-exclusive.
import { useExchangeContext } from '@/lib/context/hooks';
import { useAgentAccount } from '@/lib/context/hooks/ExchangeContext/nested/accounts/useAgentAccount';
// 2026-09-22, dropdown-hooks consolidation — see TokenSelectDropDown.tsx's
// own header comment for why these come from the real packages now, and why
// usePanelVisible/useOpenActiveListPanel specifically must come from
// @sponsorcoin/spcoin-exchange-engine (not spcoin-panels, whose own
// usePanelVisible export is a different, meritPanelState-bound hook).
import { usePanelVisible, useOpenActiveListPanel } from '@sponsorcoin/spcoin-exchange-engine';
import { validateAccount } from '@/lib/context/hooks/ExchangeContext/nested/accounts/validateAccount';
import AccountAvatar from '@/components/utility/AccountAvatar';
import { PanelGate, AgentSelectDropDown as PortableAgentSelectDropDown } from '@sponsorcoin/spcoin-panels';

/**
 * Agent picker — real, ExchangeContext-bound hook wiring (data resolution,
 * open/close orchestration, the Sponsor/Recipient/Agent mutual-exclusion
 * rule from validateAccount.ts) feeding the portable, hook-free
 * AgentSelectDropDown from @sponsorcoin/spcoin-panels (promoted from an
 * inert placeholder 2026-09-18, on request — see that file's own header
 * comment). This file's whole job now is exactly what StakingStatusPanel-
 * LayoutContainer.tsx already does for TradeAmountRow: resolve the real
 * values, pass them down as props, no rendering logic of its own left here.
 *
 * Previously wrapped AccountSelectDropDown (still web-app-only, still used
 * by Token/Account/Recipient's own wrappers) — bypassed here so this
 * component can render the genuinely portable npm version instead. The
 * icon resolution below (AccountAvatar vs. the QuestionRed placeholder) is
 * duplicated from AccountSelectDropDown.tsx's own identical logic rather
 * than shared, since there's no lower-level shared home for it yet.
 */
interface Props {
  panelGateId?: SP_COIN_DISPLAY | null;
  label?: string;
  /** Forwarded to the portable component — see its own doc comment. */
  addrPrePostSize?: number;
  /** No-op since the 2026-09-18 promotion — the old AssetSelectDropDown-based
   *  pill had an "expanded address" state this reset on toggle; the new
   *  portable pill has no expand state at all to reset. Kept, accepted and
   *  ignored, so existing callers (AgentHeaderContainer.tsx) don't need to
   *  change. */
  collapseKey?: unknown;
}

export default function AgentSelectDropDown({
  panelGateId,
  label = 'Select Agent',
  addrPrePostSize = 4,
}: Props) {
  const { exchangeContext } = useExchangeContext();
  const [agentAccount, setAgentAccount] = useAgentAccount();
  const { openActiveListPanel, closeActiveListPanel } = useOpenActiveListPanel();
  const agentListVisible = usePanelVisible(SP_COIN_DISPLAY.REMOTE_ACCOUNT_AGENT_LIST);

  const address = String(agentAccount?.address ?? '');
  // Same "real account with a deliberately blanked address" placeholder
  // treatment as AccountSelectDropDown.tsx's own isUnselected.
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
      // 2026-10-03 — no agent (never selected, or selection cleared) now falls
      // through to the portable component's shared Anonymous avatar, instead of
      // a blank circle / QuestionRed.png.
      icon={
        agentAccount && !isUnselected ? (
          <AccountAvatar account={agentAccount} mode={SP_COIN_DISPLAY.AGENT_ACCOUNT} className="h-full w-full object-cover" roleLabel="AGENT" />
        ) : undefined
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
