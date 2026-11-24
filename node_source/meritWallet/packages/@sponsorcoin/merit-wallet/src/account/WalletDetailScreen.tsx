// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/account/WalletDetailScreen.tsx
//
// 2026-11-24 (owner: the changes made to the account image panel go to the lowest level so every panel under ASSET_RADIO_PANELS gets them): WALLET_PANEL, the active wallet's account.json, drawn by the SAME shared layout as ACCOUNT_PANEL, TOKEN_PANEL and NETWORK_PANEL (MetaDetailScreen -> DetailScreenLayout -> DetailImageBlock).
// It only supplies the data: the wallet's icon and the rows of its account.json (name, type, website, description, chains, features).
'use client';

import React from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { getWalletAssetBaseUrl, walletAssetSlug, walletAssetUrl, useWalletAsset } from '@sponsorcoin/spcoin-panels';
import { tokenRowClass } from '@sponsorcoin/spcoin-common/styles';
import MetaDetailScreen from './MetaDetailScreen';
import type { MetaDataRow } from '../panels/ReadOnlyMetaDataTable';

export default function WalletDetailScreen({ walletId, baseUrl = getWalletAssetBaseUrl() }: { walletId?: string; baseUrl?: string }) {
  const slug = walletAssetSlug(walletId ?? '');
  const info = useWalletAsset(slug, baseUrl, undefined);
  if (!slug) return <p id="WALLET_PANEL">No wallet is active.</p>;
  if (!info) return <p id="WALLET_PANEL">Reading {slug}...</p>;
  const rows: MetaDataRow[] = [{ label: 'Name', value: info.name }];
  if (info.type) rows.push({ label: 'Type', value: `${info.type} wallet` });
  if (info.website) rows.push({ label: 'Website', value: <a href={info.website} target="_blank" rel="noreferrer" className={tokenRowClass.link}>{info.website}</a> });
  if (info.description) rows.push({ label: 'Description', value: info.description });
  if (info.supportedChains?.length) rows.push({ label: 'Supported chains', value: info.supportedChains.join(', ') });
  if (info.features?.length) rows.push({ label: 'Features', value: info.features.join(', ') });
  return (
    <MetaDetailScreen
      screenId="WALLET_PANEL"
      logoFlag={SP_COIN_DISPLAY.WALLET_LOGO}
      metaFlag={SP_COIN_DISPLAY.WALLET_META_DATA}
      logoId="WALLET_LOGO"
      metaId="WALLET_META_DATA"
      logoSrc={walletAssetUrl(slug, info.icon || 'wallet.png', baseUrl)}
      logoAlt={info.name}
      toggleLabel="Wallet Meta"
      imageKind="wallet"
      rows={rows}
    />
  );
}
