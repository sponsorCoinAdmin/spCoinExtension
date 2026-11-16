// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/panels/AgentSelectDropDown.tsx
//
// 2026-11-15 (owner: "an absolute single source of truth extension"): the agent pill is no longer a component of its own. It is AccountSelectDropDown, which extends AssetSelectDropDown (the one place that draws every
// select dropdown and fetches a missing image / symbol / name by address, with its spinner). What is its own: the agent wording, its id, and the props the wallet and the web app already pass. It used to be a separate
// inline-styled copy (because the extension had no Tailwind pipeline when it was written); that reason is gone, the header's account pill already runs on AssetSelectDropDown in the extension.
'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { AccountSelectDropDown, ASSET_SELECT_DISPLAY } from '@sponsorcoin/spcoin-panels';
export default function AgentSelectDropDown({ icon, address, symbol, name, placeholderLabel = 'Select Agent', onSelectClick, listOpen, addrPrePostSize, panelGateId, panelGate }) {
    return (_jsx(AccountSelectDropDown, { rootId: "AGENT_SELECT_DROP_DOWN", hasEntity: Boolean(address), icon: icon, symbol: symbol, name: name, address: address ?? '', label: placeholderLabel, copyLabel: "Copy Account Address", listOpen: listOpen, showDisplay: ASSET_SELECT_DISPLAY.ICON |
            ASSET_SELECT_DISPLAY.SYMBOL |
            ASSET_SELECT_DISPLAY.NAME |
            ASSET_SELECT_DISPLAY.ADDRESS |
            ASSET_SELECT_DISPLAY.COPY |
            (listOpen ? ASSET_SELECT_DISPLAY.CHEVRON_UP : ASSET_SELECT_DISPLAY.CHEVRON_DN) |
            ASSET_SELECT_DISPLAY.ADDR_COMP, onSelectClick: onSelectClick, addrPrePostSize: addrPrePostSize, panelGateId: panelGateId, panelGate: panelGate }));
}
