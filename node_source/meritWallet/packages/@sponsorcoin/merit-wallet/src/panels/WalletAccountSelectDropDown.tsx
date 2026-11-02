// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/panels/WalletAccountSelectDropDown.tsx
//
// 2026-11-01 (owner request): the wallet header's account pill, as its own dropdown. It replaces AccountSelectDropDown in WalletAccountHeader (the other AccountSelectDropDown uses -- the Send tab, staking, messages -- are untouched).
//
// Chevron rule (owner): the chevron points UP when WalletAccountListVisible, DOWN otherwise.
//   WalletAccountListVisible = the wallet's list panel (ASSET_SELECT_LIST_PANEL) is open AND LOCAL_ACCOUNT_WALLET_LIST, or any panel nested under it (isSubChildOf, spcoin-common), is visible.
// It reads the panel tree itself: the host passes no chevron state, so the pill cannot disagree with what is drawn.
import React, { useSyncExternalStore } from 'react';
import { SP_COIN_DISPLAY, PARENT_OF, isSubChildOf } from '@sponsorcoin/spcoin-common/panels';
import { walletPartClass } from '@sponsorcoin/spcoin-common/styles';
import { panelStore } from '@sponsorcoin/spcoin-exchange-engine';
import { AssetSelectDropDown, ASSET_SELECT_DISPLAY } from '@sponsorcoin/spcoin-panels';
import { ANONYMOUS_ACCOUNT_AVATAR_URL } from '@sponsorcoin/spcoin-feeds/accounts';

/** LOCAL_ACCOUNT_WALLET_LIST and everything nested under it, any depth. */
const ACCOUNT_LIST_PANELS: readonly SP_COIN_DISPLAY[] = [
  SP_COIN_DISPLAY.LOCAL_ACCOUNT_WALLET_LIST,
  ...Object.keys(PARENT_OF)
    .map((id) => Number(id) as SP_COIN_DISPLAY)
    .filter((id) => isSubChildOf(SP_COIN_DISPLAY.LOCAL_ACCOUNT_WALLET_LIST, id)),
];

const readWalletAccountListVisible = (): boolean =>
  panelStore.getPanelSnapshot(SP_COIN_DISPLAY.ASSET_SELECT_LIST_PANEL) &&
  ACCOUNT_LIST_PANELS.some((panel) => panelStore.getPanelSnapshot(panel));

/** WalletAccountListVisible (see the header comment). */
export function useWalletAccountListVisible(): boolean {
  return useSyncExternalStore(
    (callback) => {
      const unsubscribers = [SP_COIN_DISPLAY.ASSET_SELECT_LIST_PANEL, ...ACCOUNT_LIST_PANELS].map((panel) => panelStore.subscribePanel(panel, callback));
      return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
    },
    readWalletAccountListVisible,
    () => false,
  );
}

export interface WalletAccountSelectDropDownProps {
  icon?: React.ReactNode;
  address?: string;
  symbol?: string;
  name?: string;
  placeholderLabel?: string;
  /** The pill itself was clicked: the host toggles the account list. */
  onSelectClick?: () => void;
  /** The avatar was clicked: the host opens the account's detail screen. */
  onIconClick?: (address: string) => void;
}

export default function WalletAccountSelectDropDown({ icon, address, symbol, name, placeholderLabel, onSelectClick, onIconClick }: WalletAccountSelectDropDownProps) {
  const chevronUp = useWalletAccountListVisible();
  return (
    <AssetSelectDropDown
      rootId="WALLET_ACCOUNT_HEADER"
      hasEntity={Boolean(address)}
      // 2026-10-03 -- shared Anonymous avatar when no account avatar is available.
      icon={icon}
      defaultIconSrc={ANONYMOUS_ACCOUNT_AVATAR_URL}
      showIconWhenEmpty
      symbol={symbol}
      name={name}
      address={address ?? ''}
      placeholderLabel={placeholderLabel ?? 'Select Account'}
      copyLabel="Copy Account Address"
      showDisplay={
        ASSET_SELECT_DISPLAY.ICON |
        ASSET_SELECT_DISPLAY.SYMBOL |
        ASSET_SELECT_DISPLAY.NAME |
        ASSET_SELECT_DISPLAY.ADDRESS |
        ASSET_SELECT_DISPLAY.COPY |
        (chevronUp ? ASSET_SELECT_DISPLAY.CHEVRON_UP : ASSET_SELECT_DISPLAY.CHEVRON_DN) |
        ASSET_SELECT_DISPLAY.ADDR_COMP
      }
      onRowClick={onSelectClick}
      onIconClick={onIconClick ? () => onIconClick(address ?? '') : undefined}
      addrPrePostSize={4}
      iconSizeClassName={walletPartClass.compactPill.iconSize}
      pillHeightClassName={walletPartClass.compactPill.pillHeight}
      pillFontClassName={walletPartClass.compactPill.pillFont}
      chevronSize={walletPartClass.compactPill.chevronSize}
      copyIconSize={walletPartClass.compactPill.copyIconSize}
      nameLineClassName={walletPartClass.compactPill.nameLine}
    />
  );
}
