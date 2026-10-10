// File: src/AgentSelectDropDownWithAvatar.tsx
//
// 2026-10-10 (docs/nodeSourceMigrationPlan.txt row 16) -- the agent picker as the web app mounts it, moved from node_source/spCoinPanels/AssetSelectDropDowns/AgentSelectDropDown.tsx: this package's ConnectedAgentSelectDropDown with the shared avatar that opens
// the account panel on click (spcoin-panels' AccountAvatarWithOpen), so a host no longer has to write the adapter.
'use client';

import React from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { AccountAvatarWithOpen } from '@sponsorcoin/spcoin-panels';
import ConnectedAgentSelectDropDown from './AgentSelectDropDown';

interface Props {
  panelGateId?: SP_COIN_DISPLAY | null;
  label?: string;
  addrPrePostSize?: number;
  /** Accepted and ignored, so existing callers do not change. */
  collapseKey?: unknown;
}

export default function AgentSelectDropDownWithAvatar({ panelGateId, label = 'Select Agent', addrPrePostSize = 4 }: Props) {
  return (
    <ConnectedAgentSelectDropDown
      panelGateId={panelGateId}
      label={label}
      addrPrePostSize={addrPrePostSize}
      renderAccountAvatar={(account) => <AccountAvatarWithOpen account={account} mode={SP_COIN_DISPLAY.AGENT_ACCOUNT} className="h-full w-full object-cover" roleLabel="AGENT" />}
    />
  );
}
