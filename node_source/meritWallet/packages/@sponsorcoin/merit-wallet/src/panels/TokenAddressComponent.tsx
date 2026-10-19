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

import { tokenAddressClass } from '@sponsorcoin/spcoin-common/styles';
import React, { useState } from 'react';
import { useCopyFeedback } from '../platform/useCopyFeedback';
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
  const { copied, copy } = useCopyFeedback();
  const [headerVisible, setHeaderVisible] = useState(false);

  if (!visible) return null;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!address) return;
    copy(address);
  };

  return (
    <>
      {/* Collapsible header — mirrors ActiveWalletPanel style */}
      {headerVisible && (
        <div className={tokenAddressClass.header}>
          <span className={tokenAddressClass.headerTitle}>
            {blockchainName ? `${blockchainName} Network` : 'Network'}
          </span>
          {(symbol || name) && (
            <span className={tokenAddressClass.headerSub}>
              {symbol}{name ? `: ${name}` : ''}
            </span>
          )}
        </div>
      )}

      {/* Address row — mirrors ActiveAccount style */}
      <div className={tokenAddressClass.row}>
        <div className={tokenAddressClass.iconBox}>
          {icon}
        </div>
        <div className={tokenAddressClass.pill}>
          <span
            className={tokenAddressClass.address}
            title={headerVisible ? 'Hide token info' : 'Show token info'}
            onClick={() => setHeaderVisible((v) => !v)}
          >
            {address || '—'}
          </span>
          <button
            type="button"
            onClick={onSelectClick}
            className={tokenAddressClass.selectButton}
            aria-label={tokenListVisible ? 'Close token list' : 'Select token'}
          >
            <ChevronDown
              className={tokenAddressClass.chevron(tokenListVisible)}
            />
          </button>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          disabled={!address}
          className={tokenAddressClass.copyButton}
          aria-label="Copy token contract address"
          title="Copy token contract address"
        >
          {copied
            ? <Check className={tokenAddressClass.copied} />
            : <Copy className={tokenAddressClass.copy} />
          }
        </button>
      </div>
    </>
  );
}
