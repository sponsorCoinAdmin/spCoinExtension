// File: src/AgentSelectDropDownWithAvatar.tsx
//
// 2026-10-10 (docs/nodeSourceMigrationPlan.txt row 16) -- the agent picker as the web app mounts it, moved from node_source/spCoinPanels/AssetSelectDropDowns/AgentSelectDropDown.tsx: this package's ConnectedAgentSelectDropDown with the shared avatar that opens
// the account panel on click (spcoin-panels' AccountAvatarWithOpen), so a host no longer has to write the adapter.
'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { AccountAvatarWithOpen } from '@sponsorcoin/spcoin-panels';
import ConnectedAgentSelectDropDown from './AgentSelectDropDown';
export default function AgentSelectDropDownWithAvatar({ panelGateId, label = 'Select Agent', addrPrePostSize = 4 }) {
    return (_jsx(ConnectedAgentSelectDropDown, { panelGateId: panelGateId, label: label, addrPrePostSize: addrPrePostSize, renderAccountAvatar: (account) => _jsx(AccountAvatarWithOpen, { account: account, mode: SP_COIN_DISPLAY.AGENT_ACCOUNT, className: "h-full w-full object-cover", roleLabel: "AGENT" }) }));
}
