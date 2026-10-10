// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/SendTitle.tsx
//
// 2026-09-22, real migration — promoted verbatim from the web app's real
// components/views/Headers/SendTitle.tsx. Zero hooks beyond PanelGate
// (already portable) — a pure, static, controlled-by-nothing component,
// so the whole thing moves.

'use client';

import React from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { PanelGate } from '@sponsorcoin/spcoin-panels';

export default function SendTitle() {
  return (
    <PanelGate panel={SP_COIN_DISPLAY.SEND_TITLE}>
      <div className="relative shrink-0 select-none py-3 text-center">
        <h2 className="m-0 text-xl font-extrabold leading-tight tracking-wide text-[#5981F3] md:text-2xl">
          Send
        </h2>
      </div>
    </PanelGate>
  );
}
