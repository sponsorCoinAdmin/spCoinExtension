// File: wallet.ts
//
// 2026-11-25 (owner: the extension's package, @meritWallets/meritExtension, holds the extension's injectables; the wallet is meritWeb): the WALLET page of the extension. It mounts meritWeb straight into this page as the EXT type, with the extension's bundled data. There is no frame:
// an extension page is the wallet's page, so nothing needs to be framed. This page does NOT replace sidepanel.html: the extension's own wallet is unchanged. This wallet is its own wallet (its own vault) until the extension's vault, connect relay and provider become further injectables in meritExtension.
import './wallet.css';
import React from 'react';
import { createBrowserWallet, installDebugCapture, meritDebug } from '@meritWallets/meritWeb';
import { mountMeritExtension, WALLET_TYPE } from '@meritWallets/meritExtension';
import { TestAccountsSection, createBrowserTestAccounts } from '@meritWallets/meritDevSite';
import { AuthenticationType } from '@sponsorcoin/merit-wallet';
import snapshot from '@sponsorcoin/spcoin-data/bundledFeedData.json';

// the same debug capture as the other wallets (errors, warnings, the engine's trace, storage names) goes into the ladybug dump (Ctrl+Alt+B), plus an `extension` section that says what this page is
installDebugCapture();
meritDebug.setSection('extension', () => ({
  page: window.location.href,
  build: `${chrome.runtime.getManifest().version} built ${__BUILD_TIME__}`,
  wallet_type: WALLET_TYPE,
  mount: 'meritWeb mounted directly (no frame)',
}));

// the chains come from the bundled data snapshot (a plain public endpoint each, Ethereum first, then the test chain when the snapshot has one)
const settings = snapshot as Record<string, { networkHeader?: { rpcUrl?: string; name?: string } }>;
const ORDER = [1, 8453, 137, 11155111, 31337];
const CHAINS = ORDER.map((chainId) => {
  const header = settings[`/assets/blockchains/${chainId}/defaultNetworkSettings.json`]?.networkHeader;
  return header?.rpcUrl ? { chainId, rpcUrl: String(header.rpcUrl), name: String(header.name ?? chainId) } : undefined;
}).filter((c): c is { chainId: number; rpcUrl: string; name: string } => !!c);

// the saved vault is named apart from the extension's own wallet (sidepanel.html), which is untouched; the name is kept from the first (framed) version of this page so wallets already made stay visible
const core = createBrowserWallet({ chains: CHAINS, namespace: 'merit-extension-framed' });

mountMeritExtension({
  element: document.getElementById('root')!,
  core,
  snapshot: snapshot as Record<string, unknown>,
  // the Config tab's Test Accounts section (Load / Unload the 20 Hardhat test accounts), shown on the Test choice, as in the extension's own side panel (@meritWallets/meritDevSite: test code)
  configTestAccountsContent: React.createElement(TestAccountsSection, { api: createBrowserTestAccounts(core), authenticationType: AuthenticationType.VAULT }),
});
