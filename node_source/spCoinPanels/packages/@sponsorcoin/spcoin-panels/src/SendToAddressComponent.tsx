// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/SendToAddressComponent.tsx
//
// 2026-09-22, real migration — promoted verbatim from the web app's real
// components/views/Headers/SendToAddressComponent.tsx. Fully controlled
// (value/onChange from the caller), zero hooks beyond PanelGate (already
// portable) — the whole thing moves.

'use client';

import React from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import PanelGate from './PanelGate';

export interface SendToAddressComponentProps {
  value: string;
  onChange: (v: string) => void;
}

export default function SendToAddressComponent({ value, onChange }: SendToAddressComponentProps) {
  return (
    <PanelGate panel={SP_COIN_DISPLAY.SEND_TO_ADDRESS}>
      <div className="shrink-0 border-b border-slate-700/50 -mx-4 px-4 py-2 flex items-center gap-3 text-sm">
        <span className="text-[#8FA8FF] font-semibold whitespace-nowrap">To Address</span>
        <input
          className="flex-1 min-w-0 rounded-[22px] bg-[#243056] px-3 py-1 text-[15px] text-[#5981F3] font-mono placeholder:text-slate-500 focus:outline-none border-0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="transfer(to)"
          autoComplete="off"
          spellCheck={false}
        />
      </div>
    </PanelGate>
  );
}
