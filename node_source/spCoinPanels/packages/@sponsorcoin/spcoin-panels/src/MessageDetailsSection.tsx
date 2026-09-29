// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/MessageDetailsSection.tsx
//
// 2026-09-22, real migration (opaque-slot split) — promoted from the web
// app's real components/views/MessagePanel/MessageDetailsSection.tsx. The
// real app's own MessageAccountRow/MessageTokenRow stay local by design,
// not as a gap: both render through a local, ExchangeContext-bound
// AccountSelectDropDown/TokenLogo (TokenLogo specifically has an always-on
// click-to-preview behavior with no prop to disable it, confirmed when
// TokenAddressComponent was migrated) and are ALSO reused directly by
// ProcessFlowPanel.tsx (its own signer/accounts rows), so they can't move
// without dragging real ExchangeContext coupling along. renderAccountRow/
// renderTokenRow are slots the caller fills with those real local rows;
// this component keeps the one piece that's genuinely portable and was
// worth sharing on its own -- the hasAmount/hasReason/hasGasFee/
// hasAccounts/hasTokens gating and layout order.
'use client';

import type { ReactNode } from 'react';
import type { ErrorMessage, MessageAccountEntry, MessageTokenEntry } from '@sponsorcoin/spcoin-common/context';
import MessageLabelValueRow from './MessageLabelValueRow';

export interface MessageDetailsSectionProps {
  errorMessage: ErrorMessage | undefined;
  /** Renders one account row (icon/symbol/name/address) — the caller
   *  supplies the real, ExchangeContext-bound row component. */
  renderAccountRow: (entry: MessageAccountEntry, index: number) => ReactNode;
  /** Renders one token row (logo/symbol/name) — the caller supplies the
   *  real, ExchangeContext-bound row component. */
  renderTokenRow: (entry: MessageTokenEntry, index: number) => ReactNode;
}

export default function MessageDetailsSection({ errorMessage, renderAccountRow, renderTokenRow }: MessageDetailsSectionProps) {
  const hasAmount = Boolean(errorMessage?.amount);
  const hasReason = Boolean(errorMessage?.reason);
  const hasGasFee = Boolean(errorMessage?.gasFee);
  const hasAccounts = Boolean(errorMessage?.accounts && errorMessage.accounts.length > 0);
  const hasTokens = Boolean(errorMessage?.tokens && errorMessage.tokens.length > 0);

  if (!hasAmount && !hasReason && !hasGasFee && !hasAccounts && !hasTokens) return null;

  return (
    <div className="flex flex-col gap-1.5">
      {hasAmount && <MessageLabelValueRow label={errorMessage!.amount!.label} value={errorMessage!.amount!.value} />}
      {hasReason && <MessageLabelValueRow label="Reason" value={errorMessage!.reason!} />}
      {hasGasFee && <MessageLabelValueRow label="Gas Fee" value={errorMessage!.gasFee!} />}
      {hasAccounts && errorMessage!.accounts!.map((entry, i) => renderAccountRow(entry, i))}
      {hasTokens && errorMessage!.tokens!.map((entry, i) => renderTokenRow(entry, i))}
    </div>
  );
}
