// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/panels/AgentSelectDropDown.tsx
//
// 2026-11-15 (owner: "an absolute single source of truth extension"): the agent pill is no longer a component of its own. It is AccountSelectDropDown, which extends AssetSelectDropDown (the one place that draws every
// select dropdown and fetches a missing image / symbol / name by address, with its spinner). What is its own: the agent wording, its id, and the props the wallet and the web app already pass. It used to be a separate
// inline-styled copy (because the extension had no Tailwind pipeline when it was written); that reason is gone, the header's account pill already runs on AssetSelectDropDown in the extension.
'use client';

import React from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { AccountSelectDropDown, ASSET_SELECT_DISPLAY } from '@sponsorcoin/spcoin-panels';

export interface AgentSelectDropDownProps {
  /** Rendered in the icon slot when an agent is selected. Omit it and the shared dropdown shows the account's own image (fetched by address when it has one), else the shared Anonymous avatar. */
  icon?: React.ReactNode;
  address?: string;
  symbol?: string;
  name?: string;
  /** Shown (as "$placeholderLabel: ") when nothing is selected. */
  placeholderLabel?: string;
  /** Called on click (e.g. open/close an agent picker). Omit for an inert pill. */
  onSelectClick?: (e: React.SyntheticEvent) => void;
  /** Whether the picker this trigger opens is open: flips the chevron (up means open). */
  listOpen?: boolean;
  /** Chars kept before/after the "..." filler. */
  addrPrePostSize?: number;
  /** Panel id this instance is gated by; omitted, it renders unconditionally. */
  panelGateId?: number;
  /** The PanelGate to gate with when panelGateId is set (injected so the dropdown has no app-specific import). */
  panelGate?: React.ComponentType<{ panel: number; children: React.ReactNode; lazyLoad?: boolean; className?: string }>;
}

export default function AgentSelectDropDown({ icon, address, symbol, name, placeholderLabel = 'Select Agent', onSelectClick, listOpen, addrPrePostSize, panelGateId, panelGate }: AgentSelectDropDownProps) {
  return (
    <AccountSelectDropDown
      rootId="AGENT_SELECT_DROP_DOWN"
      hasEntity={Boolean(address)}
      icon={icon}
      symbol={symbol}
      name={name}
      address={address ?? ''}
      label={placeholderLabel}
      copyLabel="Copy Account Address"
      listOpen={listOpen}
      showDisplay={
        ASSET_SELECT_DISPLAY.ICON |
        ASSET_SELECT_DISPLAY.SYMBOL |
        ASSET_SELECT_DISPLAY.NAME |
        ASSET_SELECT_DISPLAY.ADDRESS |
        ASSET_SELECT_DISPLAY.COPY |
        (listOpen ? ASSET_SELECT_DISPLAY.CHEVRON_UP : ASSET_SELECT_DISPLAY.CHEVRON_DN) |
        ASSET_SELECT_DISPLAY.ADDR_COMP
      }
      onSelectClick={onSelectClick}
      iconPanel={SP_COIN_DISPLAY.AGENT_PANEL}
      addrPrePostSize={addrPrePostSize}
      panelGateId={panelGateId}
      panelGate={panelGate}
    />
  );
}
