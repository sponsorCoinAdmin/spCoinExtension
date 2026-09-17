// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/SendTabPanel.tsx
// Portable placeholder for SEND_PANEL (2026-09-12) — the real app version
// (components/views/RadioOverlayPanels/SendPanel.tsx -> SendComponent.tsx)
// reads a live sell-token contract/balance and a real recipient account,
// and posts a real ERC20 transfer — none of which exists in a standalone
// consumer (the extension, today). Same shape (send-amount row, recipient
// pill, submit button), entirely inert. Named SendTabPanel, not SendPanel,
// to avoid a same-named-different-shape export clash with a future real
// port. Placeholder, not logic, per explicit instruction.

'use client';

import React from 'react';
import { PACKAGE_BUILD } from './packageBuildTag';
import TabBodyMarker from './TabBodyMarker';
import TradeAmountRow from './TradeAmountRow';

export interface SendTabPanelProps {
  sendTokenSymbol?: string;
  sendTokenAddress?: string;
  sendTokenIcon?: React.ReactNode;
  recipientSymbol?: string;
  recipientAddress?: string;
  recipientIcon?: React.ReactNode;
  onSubmit?: () => void;
  submitLabel?: string;
  /** 2026-09-15, on request ("the Token/Account/NetworkSelectListDropdown
   *  chevrons [need] to be linked to the required panels") — same shape as
   *  ExchangeTradingPair.tsx's own onSellTokenClick/onBuyTokenClick, just
   *  named for what these two rows actually are here (a token pill and a
   *  recipient-account pill, not a sell/buy pair). Threaded straight
   *  through to TradeAmountRow's existing onTokenPillClick — that prop
   *  already existed and was already wired to each row's own pill onClick;
   *  it just had no caller supplying a handler until now. */
  onSendTokenClick?: (e: React.SyntheticEvent) => void;
  onRecipientClick?: (e: React.SyntheticEvent) => void;
}

export default function SendTabPanel({
  sendTokenSymbol,
  sendTokenAddress,
  sendTokenIcon,
  recipientSymbol,
  recipientAddress,
  recipientIcon,
  onSubmit,
  submitLabel = 'Enter an Amount',
  onSendTokenClick,
  onRecipientClick,
}: SendTabPanelProps) {
  return (
    // 2026-09-14, on request ("spacing between SEND_SELECT_PANEL,
    // SEND_ADDRESS_HEADER_BAR and SEND_BUTTON... not the case in the swap
    // panel") — gap:8/padding:12 here were the same kind of invented,
    // never-tied-to-anything-real values TradingStationPanel.tsx's own
    // header comment already called out and fixed for that file. The real
    // app's SendComponent.tsx container is `gap-1` (4px, no explicit
    // padding of its own) — same TSP_TW.gap constant TradingStationPanel.tsx
    // matches — so this now uses that file's own gap:4/padding:8 instead of
    // a second, larger, made-up value.
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 4, padding: 8 }}>
      <TabBodyMarker path="SendTabPanel.tsx" build={PACKAGE_BUILD} />
      <TradeAmountRow label="You Send" tokenIcon={sendTokenIcon} tokenSymbol={sendTokenSymbol} tokenAddress={sendTokenAddress} balanceText="Balance: 0" onTokenPillClick={onSendTokenClick} />
      <TradeAmountRow label="Recipient" tokenIcon={recipientIcon} tokenSymbol={recipientSymbol} tokenAddress={recipientAddress} onTokenPillClick={onRecipientClick} />
      <button
        type="button"
        onClick={onSubmit}
        style={{
          width: '100%',
          borderRadius: 8,
          border: 'none',
          background: '#243056',
          color: '#7d8ec9',
          fontSize: 12,
          fontWeight: 600,
          padding: '10px 0',
          cursor: onSubmit ? 'pointer' : 'default',
        }}
      >
        {submitLabel}
      </button>
    </div>
  );
}
