// File: node_source/spCoinPanels/AssetSelectDropDowns/RecipientSelectDropDown.tsx
'use client';

import React, { useCallback } from 'react';
import type { spCoinAccount, TokenContract } from '@/lib/structure';
import { FEED_TYPE, SP_COIN_DISPLAY } from '@/lib/structure';
// Merit-exclusive (2026-09-04, part of the real split, on request) —
// nested under TradingStationPanel, Merit-exclusive.
import { useExchangeContext } from '@/lib/context/hooks';
// 2026-09-22, dropdown-hooks consolidation — see TokenSelectDropDown.tsx's
// own header comment for why these come from the real packages now, and why
// usePanelVisible/useOpenActiveListPanel specifically must come from
// @sponsorcoin/spcoin-exchange-engine (not spcoin-panels, whose own
// usePanelVisible export is a different, meritPanelState-bound hook).
import { usePanelVisible, useOpenActiveListPanel } from '@sponsorcoin/spcoin-exchange-engine';
import { useSelectionCommit } from '@/lib/context/hooks/ExchangeContext/selectionCommit/useSelectionCommit';
import { validateAccount } from '@/lib/context/hooks/ExchangeContext/nested/accounts/validateAccount';
import AccountAvatar from '@/components/utility/AccountAvatar';
import {
  PanelGate,
  AccountSelectDropDown as PortableAccountSelectDropDown,
  ACCOUNT_SELECT_DISPLAY,
} from '@sponsorcoin/spcoin-panels';

/**
 * Recipient picker — real, ExchangeContext-bound hook wiring (account
 * resolution, the Sponsor/Recipient/Agent mutual-exclusion rule from
 * validateAccount.ts, open/close orchestration) feeding the portable,
 * hook-free AccountSelectDropDown from @sponsorcoin/spcoin-panels directly
 * — promoted 2026-09-18, on request. Previously delegated to this folder's
 * own AccountSelectDropDown.tsx wrapper (icon resolution + the default
 * open-list behavior); now does both itself, since this component's entire
 * body was already just "AccountSelectDropDown with recipient-specific
 * hook-resolved props" — an extra local wrapper layer in between added
 * nothing a second npm component would have owned. Supports raw address
 * entry (the picker's ADDRESS_PANEL), unlike SponsorSelectDropDown —
 * sponsor is the connected wallet account, not a picked address (future
 * dev).
 */
interface Props {
  panelGateId?: SP_COIN_DISPLAY | null;
  label?: string;
  showDisplay?: number;
  showSymbol?: boolean;
  showName?: boolean;
  nameLineSuffix?: React.ReactNode;
  /** Forwarded to the portable component — see its own doc comment. */
  collapseKey?: unknown;
  /** Forwarded to the portable component — see its own doc comment. */
  onExpandedChange?: (expanded: boolean) => void;
  iconSizeClassName?: string;
  pillHeightClassName?: string;
  pillFontClassName?: string;
  chevronSize?: number;
  copyIconSize?: number;
  /** Feed type used when opening the recipient list. Defaults to REMOTE_RECIPIENT_ACCOUNTS — today's behavior. */
  feedType?: FEED_TYPE;
  /**
   * Overrides both the displayed account and the pick's commit target
   * together (both-or-neither — a partial override would leave the pill
   * showing one account while committing to a different one). Defaults to
   * Merit's own recipientAccount + commitRecipient pair — today's behavior.
   */
  accountOverride?: {
    account: spCoinAccount | undefined;
    onCommit: (asset: spCoinAccount | TokenContract) => void;
  };
  /**
   * Overrides the default Sponsor/Recipient/Agent mutual-exclusion check.
   * When omitted: applies the default validateAccount('RECIPIENT', ...)
   * check against Merit's own accounts if no accountOverride is given
   * (today's behavior), or skips validation entirely if accountOverride is
   * given (the override's account source isn't Merit's account set, so the
   * default check wouldn't apply meaningfully).
   */
  validateSelection?: (address: string) => { ok: boolean; message?: string };
}

export default function RecipientSelectDropDown({
  panelGateId,
  label = 'Select Recipient',
  showDisplay,
  showSymbol,
  showName,
  nameLineSuffix,
  collapseKey,
  onExpandedChange,
  iconSizeClassName,
  pillHeightClassName,
  pillFontClassName,
  chevronSize,
  copyIconSize,
  feedType = FEED_TYPE.REMOTE_RECIPIENT_ACCOUNTS,
  accountOverride,
  validateSelection,
}: Props) {
  const { exchangeContext } = useExchangeContext();
  const { commitRecipient } = useSelectionCommit();
  const { openActiveListPanel, closeActiveListPanel } = useOpenActiveListPanel();
  const recipientAccount = accountOverride
    ? accountOverride.account
    : exchangeContext?.apiCoreSyncedMembers?.accounts?.recipientAccount;
  const recipientListVisible = usePanelVisible(SP_COIN_DISPLAY.REMOTE_ACCOUNT_RECIPIENT_LIST);

  const address = String(recipientAccount?.address ?? '');
  // Same "real account with a deliberately blanked address" placeholder
  // treatment as AccountSelectDropDown.tsx's own isUnselected.
  const isUnselected = !!recipientAccount && !address;

  // ICON | SYMBOL | ADDRESS (no NAME): same trigger-pill convention as
  // Owner/Deployed Contract on SpCoinAccessController and Send's own
  // Tokens/Recipient rows — symbol + compact address, not the fuller
  // "$symbol | $name" line list rows use. Was ICON | ADDRESS only (no
  // symbol at all) before.
  const resolvedShowDisplay =
    showDisplay ??
    (ACCOUNT_SELECT_DISPLAY.ICON |
      ACCOUNT_SELECT_DISPLAY.SYMBOL |
      ACCOUNT_SELECT_DISPLAY.ADDRESS |
      (recipientListVisible ? ACCOUNT_SELECT_DISPLAY.CHEVRON_UP : ACCOUNT_SELECT_DISPLAY.CHEVRON_DN) |
      ACCOUNT_SELECT_DISPLAY.COPY |
      ACCOUNT_SELECT_DISPLAY.ADDR_COMP);

  const openRecipientList = useCallback(
    () => {
      if (recipientListVisible) {
        closeActiveListPanel('RecipientSelectDropDown:closeRecipientList');
        return;
      }

      openActiveListPanel(
        {
          feedType,
          onCommit: accountOverride ? accountOverride.onCommit : (asset) => commitRecipient(asset as spCoinAccount),
          selectOnLogoClick: true,
          validateSelection:
            validateSelection ??
            (accountOverride
              ? undefined
              : (addr) =>
                  validateAccount('RECIPIENT', addr, exchangeContext?.apiCoreSyncedMembers?.accounts ?? {})),
        },
        'RecipientSelectDropDown:openRecipientList',
        SP_COIN_DISPLAY.REMOTE_ACCOUNT_RECIPIENT_LIST,
      );
    },
    [
      recipientListVisible,
      openActiveListPanel,
      closeActiveListPanel,
      commitRecipient,
      exchangeContext?.apiCoreSyncedMembers?.accounts,
      feedType,
      accountOverride,
      validateSelection,
    ],
  );

  return (
    <PortableAccountSelectDropDown
      hasEntity={!!recipientAccount}
      // 2026-10-03 — unselected recipient falls through to the shared Anonymous
      // avatar (see AccountSelectDropDown.tsx's identical change).
      icon={
        recipientAccount && !isUnselected ? (
          <AccountAvatar
            account={recipientAccount}
            mode={SP_COIN_DISPLAY.RECIPIENT_ACCOUNT}
            className="h-full w-full object-cover"
            roleLabel="RECIPIENT"
          />
        ) : undefined
      }
      symbol={isUnselected ? undefined : recipientAccount?.symbol}
      name={isUnselected ? undefined : recipientAccount?.name}
      address={address}
      label={label}
      copyLabel="Copy Account Address"
      showDisplay={resolvedShowDisplay}
      showSymbol={showSymbol}
      showName={showName}
      nameLineSuffix={nameLineSuffix}
      onSelectClick={openRecipientList}
      listOpen={recipientListVisible}
      addrPrePostSize={4}
      panelGateId={panelGateId === null ? undefined : (panelGateId ?? SP_COIN_DISPLAY.ACCOUNT_SELECT_DROP_DOWN)}
      panelGate={panelGateId === null ? undefined : PanelGate}
      collapseKey={collapseKey}
      onExpandedChange={onExpandedChange}
      iconSizeClassName={iconSizeClassName}
      pillHeightClassName={pillHeightClassName}
      pillFontClassName={pillFontClassName}
      chevronSize={chevronSize}
      copyIconSize={copyIconSize}
    />
  );
}
