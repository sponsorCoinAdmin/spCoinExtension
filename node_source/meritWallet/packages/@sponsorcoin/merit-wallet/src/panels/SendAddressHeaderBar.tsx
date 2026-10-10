// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/SendAddressHeaderBar.tsx
// Portable shell for SEND_ADDRESS_HEADER_BAR (66) — real content, 2026-09-24.
// The real web app's own components/views/Headers/SendAddressHeaderBar.tsx
// (38 lines) is itself already a thin wrapper — it renders TWO real pieces:
// ActiveWalletPanel (a generic ~35-panel title-strip banner, tightly coupled
// to the web app's own full panel surface AND meritConnect's approval-request
// singleton) and ActiveAccount.tsx (100 lines — "who is sending this",
// genuinely reusable). Deliberately RIGHT-SIZED, not a 1:1 port: only
// ActiveAccount's real value (the active-account trigger row + wallet-list
// chevron + address-expand toggle) moves here. ActiveWalletPanel's generic
// title logic (useActiveWalletPanelTitle.tsx, 230 lines covering ~35
// web-app-only panels like TOKEN_BUY_PANEL/AGENT_PANEL/ADD_WALLET_ACCOUNT
// leaf forms) does NOT move — the extension already has its own, correctly
//-scoped title computation for its own actual (much smaller) panel surface
// in MeritWallet.tsx, and porting the web app's version would compute titles
// for panels the extension doesn't have. `accountType` defaults to the
// generic "Active Account" here instead of the real app's contextual
// Deposit/Trading/Rewards-tab label (which only exists because of tabs the
// extension doesn't render the same way) — a caller can still override it.
//
// Non-portable pieces kept as opaque slots: RoleTableComponent (224 real
// lines, ExchangeContext/cacheRefreshBus-bound, self-contained real feature
// beyond this bar's own "who is sending this" scope) — passed in as
// `roleTableSlot`, omitted entirely when not supplied (safe, matches this
// package's every other optional-slot convention).
//
// Real naming trap found and worked around, not silently ported over: the
// real app's ActiveAccount.tsx calls a DIFFERENT, older, non-portable
// AccountSelectDropDown (node_source/spCoinPanels/AssetSelectDropDowns/,
// `recipientAccount`+`mode`-shaped props) than this package's own, already-
// portable AccountSelectDropDown.tsx (flat `address`/`symbol`/`name`/`icon`
// props) — despite sharing a name, they're genuinely different components.
// This file uses the package's own version, destructuring `account` into
// its flat props directly, rather than porting the older component too.

'use client';

import { walletColors, walletTints } from '@sponsorcoin/spcoin-common/styles';
import React, { useMemo } from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import type { spCoinAccount } from '@sponsorcoin/spcoin-common/context';
import { usePanelTree, usePanelVisible, useOpenActiveListPanel } from '@sponsorcoin/spcoin-exchange-engine';
import { PanelGate } from '@sponsorcoin/spcoin-panels';
import { AccountSelectDropDown, ACCOUNT_SELECT_DISPLAY } from '@sponsorcoin/spcoin-panels';
import { PACKAGE_BUILD } from '@sponsorcoin/spcoin-panels';
import { TabBodyMarker } from '@sponsorcoin/spcoin-panels';

export interface SendAddressHeaderBarProps {
  account?: spCoinAccount;
  /** Defaults to the generic 'Active Account' — see this file's own header
   *  comment for why the real app's contextual Deposit/Trading/Rewards
   *  label isn't reproduced here. */
  accountType?: string;
  showTitle?: boolean;
  /** Opaque slot for the real app's RoleTableComponent — omitted renders
   *  nothing, same as every other optional slot in this package. */
  roleTableSlot?: React.ReactNode;
}

const BASE_SHOW_DISPLAY =
  ACCOUNT_SELECT_DISPLAY.ICON |
  ACCOUNT_SELECT_DISPLAY.SYMBOL |
  ACCOUNT_SELECT_DISPLAY.ADDRESS |
  ACCOUNT_SELECT_DISPLAY.COPY;

export default function SendAddressHeaderBar({
  account,
  accountType = 'Active Account',
  showTitle = true,
  roleTableSlot,
}: SendAddressHeaderBarProps) {
  const { openPanel, setPanelVisible } = usePanelTree();
  const { closeActiveListPanel } = useOpenActiveListPanel();
  const walletAccountsVisible = usePanelVisible(SP_COIN_DISPLAY.LOCAL_ACCOUNT_WALLET_LIST);
  // Independent from WALLET_RADIO_PANELS (the Merit Wallet header banner) —
  // this toggle only affects this widget's own address row. See the real
  // app's own ActiveAccount.tsx for the identical reasoning.
  const addressExpanded = usePanelVisible(SP_COIN_DISPLAY.ACTIVE_ACCOUNT_ADDRESS_EXPANDED);

  const address = String(account?.address ?? '').trim();

  const showDisplay = useMemo(
    () =>
      BASE_SHOW_DISPLAY |
      (walletAccountsVisible ? ACCOUNT_SELECT_DISPLAY.CHEVRON_UP : ACCOUNT_SELECT_DISPLAY.CHEVRON_DN),
    [walletAccountsVisible],
  );

  if (!address) return null;

  const handleChevronClick = () => {
    if (walletAccountsVisible) {
      closeActiveListPanel('SendAddressHeaderBar:chevron:close');
    } else {
      openPanel(
        SP_COIN_DISPLAY.ASSET_LIST_SELECT_PANEL,
        'SendAddressHeaderBar:chevron:open',
        SP_COIN_DISPLAY.LOCAL_ACCOUNT_WALLET_LIST,
      );
    }
  };

  const handleAddressClick = () => {
    setPanelVisible(
      SP_COIN_DISPLAY.ACTIVE_ACCOUNT_ADDRESS_EXPANDED,
      !addressExpanded,
      'SendAddressHeaderBar:addressClick',
    );
  };

  return (
    <PanelGate panel={SP_COIN_DISPLAY.SEND_ADDRESS_HEADER_BAR}>
      <TabBodyMarker path="SendAddressHeaderBar.tsx" build={PACKAGE_BUILD} />
      <div
        style={{
          flexShrink: 0,
          borderBottom: '1px solid rgba(51,65,85,0.5)',
          paddingBottom: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 16,
          color: walletTints.oneOffSoftTint80,
        }}
      >
        <div style={{ display: 'flex', minWidth: 0, flex: 1, flexDirection: 'column', gap: 2 }}>
          {showTitle && (
            <span style={{ textAlign: 'center', fontSize: 15, fontWeight: 600, color: walletColors.accent }}>
              {accountType}
              {account?.name ? ` ${account.name}` : ''}
            </span>
          )}
          <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 2 }}>
            <AccountSelectDropDown
              icon={
                account?.logoURL ? (
                  <img src={account.logoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : undefined
              }
              address={account?.address}
              symbol={account?.symbol}
              name={account?.name}
              showDisplay={showDisplay}
              onSelectClick={handleChevronClick}
              onAddressClick={handleAddressClick}
              label="Select Active Wallet Account"
              panelGateId={SP_COIN_DISPLAY.ACCOUNT_SELECT_DROP_DOWN}
            />
            {roleTableSlot && <div style={{ marginLeft: 'auto', marginRight: 6 }}>{roleTableSlot}</div>}
          </div>
        </div>
      </div>
    </PanelGate>
  );
}
