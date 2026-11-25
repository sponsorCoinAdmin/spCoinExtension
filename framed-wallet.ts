// File: framed-wallet.ts
//
// 2026-11-25 (owner: complete the extension on meritIFrame and meritWeb): the WALLET page of the framed wallet: @meritWallets/meritWeb mounted with the extension's bundled data. When it is framed by the extension's own host page (framed.html) it takes the wallet type and host functions from that page over the frame protocol
// (only the extension's own origin is accepted as the parent); opened on its own it runs without injection. The chains come from the bundled data snapshot (a plain public endpoint each, Ethereum first, then the test chain when the snapshot has one).
import './framed-wallet.css';
import React from 'react';
import { createBrowserWallet, meritDebug, mountMeritWeb } from '@meritWallets/meritWeb';
import { TestAccountsSection, createBrowserTestAccounts } from '@meritWallets/meritDevSite';
import { AuthenticationType } from '@sponsorcoin/merit-wallet';
import { awaitParentInit, injectablesFromParent } from '@meritWallets/meritIFrame';
import snapshot from '@sponsorcoin/spcoin-data/bundledFeedData.json';
import { installDebugCapture } from './src/framedDebugCapture';

// 2026-11-25 (owner: more debug info in the extension's framed wallet): the same capture as the other wallets (errors, warnings, the engine's trace, storage names) goes into the ladybug dump (Ctrl+Alt+B), plus a `framed` section that says how this page was started
installDebugCapture();
const handshake: { framed: boolean; parentAnswered?: boolean; injectedType?: string; functions?: string[]; settingsKeys?: string[]; waitedMs?: number } = { framed: window.parent !== window };
meritDebug.setSection('framed', () => ({
  page: window.location.href,
  build: `${chrome.runtime.getManifest().version} built ${__BUILD_TIME__}`,
  frame: handshake.framed ? 'inside a frame' : 'opened on its own',
  parent_origin: (window.location as Location & { ancestorOrigins?: DOMStringList }).ancestorOrigins?.[0] ?? '(not known)',
  handshake: handshake.framed ? (handshake.parentAnswered ? 'answered' : handshake.parentAnswered === false ? 'NO ANSWER (the wallet runs without the host injection)' : 'waiting') : 'not needed',
  injected_wallet_type: handshake.injectedType ?? '(none)',
  host_functions: handshake.functions?.join(', ') || '(none)',
  settings_keys: handshake.settingsKeys?.join(', ') || '(none)',
  waited_ms: handshake.waitedMs ?? 0,
}));

const settings = snapshot as Record<string, { networkHeader?: { rpcUrl?: string; name?: string } }>;
const ORDER = [1, 8453, 137, 11155111, 31337];
const CHAINS = ORDER.map((chainId) => {
  const header = settings[`/assets/blockchains/${chainId}/defaultNetworkSettings.json`]?.networkHeader;
  return header?.rpcUrl ? { chainId, rpcUrl: String(header.rpcUrl), name: String(header.name ?? chainId) } : undefined;
}).filter((c): c is { chainId: number; rpcUrl: string; name: string } => !!c);

// the saved vault is named apart from the extension's own wallet (sidepanel.html), which is untouched
const core = createBrowserWallet({ chains: CHAINS, namespace: 'merit-extension-framed' });

async function start() {
  const framed = window.parent !== window;
  // the parent is this extension's own host page: same origin
  const startedAt = Date.now();
  const parent = framed ? await awaitParentInit({ allowedParentOrigins: [window.location.origin] }) : undefined;
  handshake.waitedMs = Date.now() - startedAt;
  if (framed) handshake.parentAnswered = !!parent;
  const injectables = parent ? injectablesFromParent(parent) : undefined;
  handshake.injectedType = injectables?.walletType;
  handshake.functions = Object.keys(injectables?.functions ?? {});
  handshake.settingsKeys = Object.keys(injectables?.settings ?? {});
  mountMeritWeb({
    element: document.getElementById('root')!,
    core,
    snapshot: snapshot as Record<string, unknown>,
    injectables,
    // the Config tab's Test Accounts section (Load / Unload the 20 Hardhat test accounts), shown on the Test choice, as in the extension's own side panel (@meritWallets/meritDevSite: test code)
    configTestAccountsContent: React.createElement(TestAccountsSection, { api: createBrowserTestAccounts(core), authenticationType: AuthenticationType.VAULT }),
  });
}
void start();
