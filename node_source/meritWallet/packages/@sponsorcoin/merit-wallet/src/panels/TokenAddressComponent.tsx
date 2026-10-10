// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/TokenAddressComponent.tsx
//
// 2026-09-22, real migration (opaque-slot split) — promoted from the web
// app's real components/views/Headers/TokenAddressComponent.tsx. Its real
// couplings were: useSellTokenContract/useBuyTokenContract/useNativeToken
// (live ExchangeContext token data — useNativeToken specifically does a
// real async API fetch keyed off the live chain id, not just a data read)
// and TokenLogo (a local component with its OWN always-on ExchangeContext-
// bound click-to-preview behavior, confirmed by reading it directly — no
// prop disables that, so it can't be ported as-is either). Neither is
// portable, so both stay local: `token` becomes a plain resolved-data
// prop (address/symbol/name/blockchainName, already-derived strings, not
// live handles) and `icon` becomes a slot the caller fills with the real
// `<TokenLogo>`, same shape TokenSelectDropDown's own portable/local split
// already established. usePanelVisible/the chevron's open/close mechanics
// stay here, genuinely portable — this component calls them directly
// (self-gating, same pattern as SwapArrowButton/ConfigSlippagePanel
// earlier this session) — only `onSelectClick` itself (what a chevron
// click actually opens) is a caller-supplied callback, since that's the
// one piece requiring the real openActiveListPanel/onCommit/peerAddress
// wiring TokenSelectDropDown's own web-app wrapper already owns.

'use client';

import React, { useState } from 'react';
import { Copy, Check, ChevronDown } from 'lucide-react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { usePanelVisible } from '@sponsorcoin/spcoin-exchange-engine';

export interface TokenAddressComponentProps {
  panelId?: SP_COIN_DISPLAY;
  address: string;
  symbol: string;
  name: string;
  blockchainName: string;
  icon: React.ReactNode;
  onSelectClick: (e: React.SyntheticEvent) => void;
}

export default function TokenAddressComponent({
  panelId = SP_COIN_DISPLAY.TOKEN_ADDRESS_COMPONENT,
  address,
  symbol,
  name,
  blockchainName,
  icon,
  onSelectClick,
}: TokenAddressComponentProps) {
  const visible = usePanelVisible(panelId);
  const tokenListVisible = usePanelVisible(SP_COIN_DISPLAY.ACTIVE_LIST_PANEL);
  const [copied, setCopied] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(false);

  if (!visible) return null;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!address) return;
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <>
      {/* Collapsible header — mirrors ActiveWalletPanel style */}
      {headerVisible && (
        <div className="relative shrink-0 border-b border-slate-700/50 -mx-4 px-4 py-3 flex flex-col items-center">
          <span className="text-[19px] font-semibold text-[#5981F3]">
            {blockchainName ? `${blockchainName} Network` : 'Network'}
          </span>
          {(symbol || name) && (
            <span className="text-[14px] font-normal text-slate-400">
              {symbol}{name ? `: ${name}` : ''}
            </span>
          )}
        </div>
      )}

      {/* Address row — mirrors ActiveAccount style */}
      <div className="shrink-0 border-b border-slate-700/50 -mx-4 px-4 py-2 flex items-center gap-2 text-sm text-slate-300/80">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#11162A]">
          {icon}
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[22px] bg-[#243056] px-3 py-1 text-[15px] text-[#5981F3]">
          <span
            className="w-full truncate whitespace-nowrap text-center font-mono cursor-pointer"
            title={headerVisible ? 'Hide token info' : 'Show token info'}
            onClick={() => setHeaderVisible((v) => !v)}
          >
            {address || '—'}
          </span>
          <button
            type="button"
            onClick={onSelectClick}
            className="shrink-0 flex items-center justify-center rounded hover:bg-white/10 p-0.5"
            aria-label={tokenListVisible ? 'Close token list' : 'Select token'}
          >
            <ChevronDown
              className={[
                'h-4 w-4 text-slate-400 transition-transform duration-200',
                tokenListVisible ? 'rotate-180' : '',
              ].join(' ')}
            />
          </button>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          disabled={!address}
          className="shrink-0 flex items-center justify-center rounded hover:bg-white/10 pl-0.5 pr-0 disabled:opacity-40"
          aria-label="Copy token contract address"
          title="Copy token contract address"
        >
          {copied
            ? <Check className="h-6 w-6 text-green-400" />
            : <Copy className="h-6 w-6 text-slate-400" />
          }
        </button>
      </div>
    </>
  );
}
