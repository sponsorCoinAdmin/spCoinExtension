// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/panels/AccountDisplayDropDown.tsx
//
// 2026-11-10 (owner): the wallet header's account pill (avatar, name | symbol, short address, copy) as a DISPLAY: no chevron and no click, for a place that shows an account without choosing one (the Remove account dialog).
import React from 'react';
import { walletPartClass, removeAccountStyle } from '@sponsorcoin/spcoin-common/styles';
import { AssetSelectDropDown, ASSET_SELECT_DISPLAY } from '@sponsorcoin/spcoin-panels';
import { ANONYMOUS_ACCOUNT_AVATAR_URL } from '@sponsorcoin/spcoin-feeds/accounts';

export interface AccountDisplayDropDownProps {
  address: string;
  name?: string;
  symbol?: string;
  logoURL?: string;
}

export default function AccountDisplayDropDown({ address, name, symbol, logoURL }: AccountDisplayDropDownProps) {
  return (
    <AssetSelectDropDown
      rootId="ACCOUNT_DISPLAY"
      hasEntity={Boolean(address)}
      icon={logoURL ? <img src={logoURL} alt="" style={removeAccountStyle.accountImage} /> : undefined}
      defaultIconSrc={ANONYMOUS_ACCOUNT_AVATAR_URL}
      showIconWhenEmpty
      symbol={symbol}
      name={name}
      address={address}
      placeholderLabel="Account"
      copyLabel="Copy Account Address"
      showDisplay={ASSET_SELECT_DISPLAY.ICON | ASSET_SELECT_DISPLAY.SYMBOL | ASSET_SELECT_DISPLAY.NAME | ASSET_SELECT_DISPLAY.ADDRESS | ASSET_SELECT_DISPLAY.COPY | ASSET_SELECT_DISPLAY.ADDR_COMP}
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
