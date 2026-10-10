// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/SendTabPanel.tsx
// SEND_PANEL (2026-09-12) — real, portable shell. The real app's own version
// (components/views/RadioOverlayPanels/SendPanel.tsx -> SendComponent.tsx)
// reads a live sell-token contract/balance, a real recipient account, and posts
// a real ERC20 transfer; that ExchangeContext-bound logic stays in the caller.
// The extension IS a standalone consumer and now drives this shell for real:
// its MeritWallet.tsx renders this SendTabPanel with a live onSubmit wired to
// sendNativeMerit (native + ERC20, with `decimals` threaded from the token-list
// row through onSendSubmit per 2026-09-23 Stage 39) behind the always-explicit
// signAndSendMeritTransaction confirmation screen. So the shell is no longer
// inert — its submit path performs real, signed sends.
// Named SendTabPanel, not SendPanel, to avoid a same-named-different-shape
// export clash with the web app's own full SendPanel wrapper. Shell, not
// logic, per the original split decision — behavior is supplied by the caller
// via onSubmit/onRecipientClick/onSendTokenClick/onSendAmountChange.

'use client';

import React from 'react';
import { PANEL_GAP } from '@sponsorcoin/spcoin-common/styles';
import { PACKAGE_BUILD } from '@sponsorcoin/spcoin-panels';
import { TabBodyMarker } from '@sponsorcoin/spcoin-panels';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { TradeAmountRow } from '@sponsorcoin/spcoin-panels';
import { PanelGate } from '@sponsorcoin/spcoin-panels';
import { SendButton } from '@sponsorcoin/spcoin-panels';

export interface SendTabPanelProps {
  sendTokenSymbol?: string;
  sendTokenAddress?: string;
  sendTokenIcon?: React.ReactNode;
  recipientSymbol?: string;
  recipientAddress?: string;
  recipientIcon?: React.ReactNode;
  /** 2026-09-22 — the "You Send" row's real, editable amount. Omit onAmountChange to leave it inert (today's original look). */
  sendAmount?: string;
  onSendAmountChange?: (value: string) => void;
  onSubmit?: () => void;
  submitLabel?: string;
  /** True while a real send is in flight (the button says Sending… and cannot be clicked). */
  submitBusy?: boolean;
  /** What the shared Send button (spcoin-panels' SendButton) needs: the token's decimals, the sender's balance in base units (undefined while unknown), whether a recipient is picked, and the symbol. */
  sendDecimals?: number;
  sendBalanceRaw?: bigint;
  sendHasRecipient?: boolean;
  sendSymbol?: string;
  /** 2026-10-03 — "You Send" balance line (was hardcoded "Balance: 0"). The caller resolves it. */
  balanceText?: string;
  /** The Recipient row's balance line (the recipient's balance of the token being sent). */
  recipientBalanceText?: string;
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
  sendAmount,
  onSendAmountChange,
  onSubmit,
  submitBusy = false,
  balanceText = 'Balance: 0',
  recipientBalanceText,
  sendDecimals = 18,
  sendBalanceRaw,
  sendHasRecipient = false,
  sendSymbol = '',
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
    // matches.
    //
    // 2026-09-22 — `padding: 8` removed entirely (was itself still an
    // invented value, just matched to TradingStationPanel.tsx's OLD number
    // instead of a real one — this file's own comment above already says
    // the real SendComponent.tsx container has "no explicit padding of its
    // own"). No extension-only styling rule — see
    // docs/npmPanelDisplayIssue.md and docs/design/spcoinPackagesDesign.md.
    //
    // 2026-09-22 — `gap` now reads PANEL_GAP from
    // @sponsorcoin/spcoin-common/styles instead of a hardcoded `4` — see
    // that file's own header comment; one shared source instead of a
    // separately hardcoded `4` in this file/TradingStationPanel.tsx/
    // SponsorshipPanel.tsx.
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: PANEL_GAP }}>
      <TabBodyMarker path="SendTabPanel.tsx" build={PACKAGE_BUILD} />
      {/* 2026-10-03 — gated on the same panel-tree flags as the web app's Send tab
          (SEND_SELECT_PANEL around the amount row, SEND_BUTTON around the submit
          button), so a flag toggle changes both apps the same way. */}
      <PanelGate panel={SP_COIN_DISPLAY.SEND_SELECT_PANEL}>
      <TradeAmountRow
        label="You Send"
        tokenIcon={sendTokenIcon}
        tokenSymbol={sendTokenSymbol}
        tokenAddress={sendTokenAddress}
        balanceText={balanceText}
        onTokenPillClick={onSendTokenClick}
        amount={sendAmount}
        onAmountChange={onSendAmountChange}
        amountDisabled={submitBusy}
      />
      </PanelGate>
      <TradeAmountRow label="Recipient" emptyPillLabel="Select Recipient" balanceText={recipientBalanceText} tokenIcon={recipientIcon} tokenSymbol={recipientSymbol} tokenAddress={recipientAddress} onTokenPillClick={onRecipientClick} />
      <PanelGate panel={SP_COIN_DISPLAY.SEND_BUTTON}>
      {/* The shared SendButton (it turns into the Connect button while no account is active). */}
      <SendButton id="SEND_BUTTON_ACTION" amount={sendAmount ?? ''} decimals={sendDecimals} balanceRaw={sendBalanceRaw} hasRecipient={sendHasRecipient} symbol={sendSymbol} isPending={submitBusy} onSend={() => onSubmit?.()} />
      </PanelGate>
    </div>
  );
}
