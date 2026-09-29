// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/UniswapTradeButton.tsx
// 2026-09-25, migrated from spcoin-nextjs-front-end's
// components/views/TradingStationPanel/UniSelectPanel/
// UniSelectPanelLayoutContainer.tsx (on request, "migrate
// UNISWAP_TRADE_BUTTON"). Presentation only, byte-identical move — real
// execution (handleSwap -> executeUniswapV3Swap/getConnectedSigner) stays
// web-app-local, same reasoning as UNI_SELECT_PANEL's own row-display
// migration (see docs/npmMigrationDesign.md's own dated entries):
// getConnectedSigner depends on meritConnect, a 1,872-line security/
// keystore/approval system the extension has no equivalent of yet.
// `disabled`/`busy`/`isNoPool` are plain booleans the caller computes from
// its own quote/swap state (`!data || swapState.status === 'pending'`,
// `showSwapBusyLabel`, `amountDisplay === 'no pool'`) and passes in — same
// "inject the non-portable pieces" pattern already used for this panel's
// own row hook. Self-gates on its own panel-tree visibility
// (UNISWAP_TRADE_BUTTON), same convention as ConfigSlippagePanel.tsx/
// BuySellSwapArrowButton.tsx — the caller no longer needs its own
// `{tradeButtonVisible && (...)}` wrapper.
'use client';

import React from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { PANEL_GAP } from '@sponsorcoin/spcoin-common/styles';
import { usePanelVisible } from '@sponsorcoin/spcoin-exchange-engine';

export interface UniswapTradeButtonProps {
  disabled?: boolean;
  busy?: boolean;
  isNoPool?: boolean;
  onClick?: () => void;
}

export default function UniswapTradeButton({
  disabled = false,
  busy = false,
  isNoPool = false,
  onClick,
}: UniswapTradeButtonProps) {
  const visible = usePanelVisible(SP_COIN_DISPLAY.UNISWAP_TRADE_BUTTON);
  if (!visible) return null;

  return (
    <div style={{ paddingTop: PANEL_GAP }}>
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={[
          'group',
          'flex items-center justify-center',
          'text-[#5981F3]',
          busy ? 'bg-orange-600' : 'bg-[#243056]',
          // 'No Pool !!!' hover cue — only wired for this specific
          // disabled reason, not disabled-in-general (e.g. zero amount,
          // still-loading), so the button doesn't cry "no pool" when
          // that isn't actually why it's inert.
          isNoPool ? 'hover:bg-orange-600' : '',
          'w-full h-[34px]',
          'text-[12px] font-bold',
          'rounded-[8px]',
          'transition-[color,background-color] duration-300',
          disabled
            ? 'opacity-60 cursor-not-allowed'
            : 'hover:cursor-pointer hover:text-green-500',
        ].join(' ')}
      >
        {busy ? (
          'Swapping…'
        ) : isNoPool ? (
          <>
            <span className="group-hover:hidden">Swap via Uniswap V3</span>
            <span className="hidden group-hover:inline group-hover:text-white">No Pool !!!</span>
          </>
        ) : (
          'Swap via Uniswap V3'
        )}
      </button>
    </div>
  );
}
