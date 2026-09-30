// File: node_source/spCoinPanels/AssetSelectDropDowns/AccountSelectDropDown.tsx
'use client';

import React, { useCallback } from 'react';
import type { spCoinAccount } from '@/lib/structure';
import { FEED_TYPE, SP_COIN_DISPLAY } from '@/lib/structure';
import { createDebugLogger } from '@/lib/utils/debugLogger';
import { useOpenActiveListPanel } from '@/lib/context/exchangeContext/hooks/useOpenActiveListPanel';
import { usePanelVisible } from '@/lib/context/exchangeContext/hooks/usePanelVisible';
import { useSelectionCommit } from '@/lib/context/hooks/ExchangeContext/selectionCommit/useSelectionCommit';
import AccountAvatar from '@/components/utility/AccountAvatar';
import PanelGate from '@/components/utility/PanelGate';
import {
  AccountSelectDropDown as PortableAccountSelectDropDown,
  ACCOUNT_SELECT_DISPLAY,
} from '@sponsorcoin/spcoin-panels';

const LOG_TIME = false;
const DEBUG_ENABLED =
  process.env.NEXT_PUBLIC_DEBUG_LOG_ACCOUNT_SELECT_DROP_DOWN === 'true';
const debugLog = createDebugLogger(
  'AccountSelectDropDown',
  DEBUG_ENABLED,
  LOG_TIME,
);

export { ACCOUNT_SELECT_DISPLAY };

interface Props {
  recipientAccount?: spCoinAccount;
  /** Mode passed to AccountAvatar — controls which account role opens in ACCOUNT_PANEL on avatar click. */
  mode?: SP_COIN_DISPLAY.ACTIVE_ACCOUNT | SP_COIN_DISPLAY.RECIPIENT_ACCOUNT | SP_COIN_DISPLAY.SPONSOR_ACCOUNT | SP_COIN_DISPLAY.AGENT_ACCOUNT;
  /** Override the default click behavior (opens ASSET_LIST_SELECT_PANEL/REMOTE_ACCOUNT_RECIPIENT_LIST). */
  onSelectClick?: (e: React.SyntheticEvent) => void;
  /**
   * Panel id this specific instance is gated by. Defaults to the shared
   * ACCOUNT_SELECT_DROP_DOWN flag. Pass `null` explicitly to opt out of
   * panel gating entirely (e.g. list-row usage, where this component is
   * always rendered and has no panel-visibility concept of its own).
   */
  panelGateId?: SP_COIN_DISPLAY | null;
  /** Fallback label shown (before ": ") when no account is selected yet. */
  label?: string;
  /** Bitmask (see ACCOUNT_SELECT_DISPLAY) controlling which sub-elements render. Defaults to all on. */
  showDisplay?: number;
  /** Show the "$symbol | $name" line's symbol half. Defaults to false. No effect when `showDisplay` is explicitly given. */
  showSymbol?: boolean;
  /** Show the "$symbol | $name" line's name half. Defaults to false. No effect when `showDisplay` is explicitly given. */
  showName?: boolean;
  /** Extra content rendered inline at the end of the "$symbol | $name" line itself (e.g. an "Active" badge) — forwarded straight through to the portable component. */
  nameLineSuffix?: React.ReactNode;
  /** Overrides the "$symbol | $name" line's className (default: text-sm font-semibold leading-tight text-white) — forwarded straight through. */
  nameLineClassName?: string;
  /**
   * Optional separate click handler for the address text only. When provided,
   * clicking the address stops propagation and calls this instead of
   * onSelectClick — lets a caller give the address and the chevron distinct
   * click targets. Omit to keep the address bubbling into onSelectClick.
   */
  onAddressClick?: (e: React.MouseEvent) => void;
  /**
   * Override the avatar/icon click (forwarded straight through). When
   * omitted, AccountAvatar's own default applies (opens that account's
   * detail panel via openAccountComponent — the same method the info.png
   * button uses). List-row callers pass this so clicking the icon returns
   * the record/address to the caller (same action as onSelectClick)
   * instead of opening the detail panel, leaving a separate info affordance
   * for details.
   */
  onIconClick?: (e: React.MouseEvent) => void;
  /** Right-click override for the avatar/icon (forwarded through). Omit to leave the native context menu untouched. */
  onIconContextMenu?: (e: React.MouseEvent) => void;
  /**
   * Chars kept before/after the "..." filler (see the portable component).
   * Defaults to 4 — today's look.
   */
  addrPrePostSize?: number;
  /** Forwarded straight through — see the portable component's own doc comment. */
  addressSizeClassName?: string;
  /** Overrides the address text's native hover title (defaults to the raw address itself). */
  addressTitle?: string;
  /**
   * Overrides the mode-derived role word (e.g. "SPONSOR" for an
   * ACTIVE_ACCOUNT that's specifically acting as the sponsor here) in the
   * avatar's default "ROLE: symbol: name" hover tooltip — see
   * AccountAvatar's getAccountRoleLabel. Omit to use the plain mode default.
   */
  roleLabel?: string;
  /** Forwarded through — see the portable component's own doc comment. */
  collapseKey?: unknown;
  /** Forwarded through — see the portable component's own doc comment. */
  onExpandedChange?: (expanded: boolean) => void;
  iconSizeClassName?: string;
  pillHeightClassName?: string;
  pillFontClassName?: string;
  chevronSize?: number;
  copyIconSize?: number;
}

/**
 * Real, ExchangeContext-bound hook wiring (icon resolution, the default
 * open/close-recipient-list click behavior) feeding the portable, hook-free
 * AccountSelectDropDown from @sponsorcoin/spcoin-panels (promoted from
 * web-app-only glue 2026-09-18, on request — see that file's own header
 * comment). This file's whole job is now resolving real values and passing
 * them down, no rendering logic of its own left here.
 */
const AccountSelectDropDown: React.FC<Props> = ({
  recipientAccount,
  mode = SP_COIN_DISPLAY.RECIPIENT_ACCOUNT,
  onSelectClick,
  panelGateId = SP_COIN_DISPLAY.ACCOUNT_SELECT_DROP_DOWN,
  label = 'Select Recipient',
  showDisplay,
  showSymbol = false,
  showName = false,
  nameLineSuffix,
  nameLineClassName,
  onAddressClick,
  onIconClick,
  onIconContextMenu,
  addrPrePostSize = 4,
  addressSizeClassName,
  addressTitle,
  roleLabel,
  collapseKey,
  onExpandedChange,
  iconSizeClassName,
  pillHeightClassName,
  pillFontClassName,
  chevronSize,
  copyIconSize,
}) => {
  const { openActiveListPanel, closeActiveListPanel } = useOpenActiveListPanel();
  const { commitRecipient } = useSelectionCommit();
  const address = String(recipientAccount?.address ?? '');
  // A caller can pass a real recipientAccount whose address has been
  // deliberately blanked out (e.g. WalletSecurityPanel's "start empty until
  // the user picks one" state) to get this placeholder treatment while
  // still keeping the row otherwise interactive — distinct from omitting
  // recipientAccount entirely, which falls back to the portable component's
  // own bare hasEntity===false path instead.
  const isUnselected = !!recipientAccount && !address;
  // Only meaningful for the default (no onSelectClick override) click/chevron
  // behavior below — callers that manage their own open/close state pass an
  // explicit showDisplay and onSelectClick instead (see PanelSubTitle,
  // AgentHeaderContainer).
  const recipientListVisible = usePanelVisible(SP_COIN_DISPLAY.REMOTE_ACCOUNT_RECIPIENT_LIST);

  const showRecipientListSelectPanel = useCallback(
    (e: React.SyntheticEvent) => {
      if (onSelectClick) {
        onSelectClick(e);
        return;
      }

      // Toggle: same chevron click closes the list when it's already open,
      // rather than always re-opening it.
      if (recipientListVisible) {
        debugLog.log?.('📂 Closing Recipient dialog');
        closeActiveListPanel('AccountSelectDropDown:closeRecipientListSelectPanel');
        return;
      }

      debugLog.log?.('📂 Opening Recipient dialog');
      openActiveListPanel(
        {
          feedType: FEED_TYPE.REMOTE_RECIPIENT_ACCOUNTS,
          onCommit: (asset) => commitRecipient(asset as spCoinAccount),
          selectOnLogoClick: true,
        },
        'AccountSelectDropDown:showRecipientListSelectPanel',
        SP_COIN_DISPLAY.REMOTE_ACCOUNT_RECIPIENT_LIST,
      );
    },
    [recipientListVisible, openActiveListPanel, closeActiveListPanel, commitRecipient, onSelectClick],
  );

  return (
    <PortableAccountSelectDropDown
      hasEntity={!!recipientAccount}
      icon={
        recipientAccount ? (
          isUnselected ? (
            // object-contain, not object-cover — QuestionRed.png is this
            // app's standard "missing logo" glyph (assetHelpers.ts's
            // defaultMissingImage, same file TokenLogo.tsx/SendSelectPanel.tsx
            // render it with); it has real padding baked in and isn't meant
            // to fill-crop like a photo avatar. object-cover zoomed/cropped
            // it to fill the 40x40 box, which read as oversized/zoomed in.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/assets/miscellaneous/QuestionRed.png"
              alt="No account selected"
              className="h-full w-full object-contain"
            />
          ) : (
            <AccountAvatar
              account={recipientAccount}
              mode={mode}
              className="h-full w-full object-cover"
              roleLabel={roleLabel}
            />
          )
        ) : undefined
      }
      // No "N/A | N/A" placeholder text — an unselected account just omits
      // the symbol/name row entirely (see the portable component's own
      // (symbol || name) guard).
      symbol={isUnselected ? undefined : recipientAccount?.symbol}
      name={isUnselected ? undefined : recipientAccount?.name}
      address={address}
      label={label}
      copyLabel="Copy Account Address"
      showDisplay={showDisplay}
      showSymbol={showSymbol}
      showName={showName}
      nameLineSuffix={nameLineSuffix}
      nameLineClassName={nameLineClassName}
      onSelectClick={showRecipientListSelectPanel}
      listOpen={recipientListVisible}
      onAddressClick={onAddressClick}
      onIconClick={onIconClick}
      onIconContextMenu={onIconContextMenu}
      addrPrePostSize={addrPrePostSize}
      addressSizeClassName={addressSizeClassName}
      addressTitle={addressTitle}
      panelGateId={panelGateId === null ? undefined : panelGateId}
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
};

export default AccountSelectDropDown;
