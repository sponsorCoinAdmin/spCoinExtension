import React from 'react';
import { createRoot } from 'react-dom/client';
import './src/tailwind.css';
import { bundledFeedData } from './src/bundledFeeds';
import { extensionAuthenticatorRegistry, extensionWallet, localVaultAuthenticator } from './src/localVaultAuthenticator';
import { METAMASK_ID } from './src/metamaskAuthenticator';
import { isExternalAccount } from './src/externalAccounts';
import { LEDGER_ID, ledgerTransport, restoreLedger } from './src/hardwareLedger';
import { startDappApprovals } from './src/dappApprovals';
import { importVaultWallet, vaultAccountsApi, vaultOnboarding, vaultStatus, vaultTestAccountsApi } from './src/vaultScreens';
import { ConnectChoiceRequired, connectAccount, type AuthenticatorId, estimateRewardsByMethod, throttleRead, AuthenticationType, MeritWalletHostView, ChangePasswordPanel, DeleteWalletDialog, createWalletRefresh, createWalletConfig, createWalletSession, walletName, type AccountProfileHost, type AddAccountHost, type WalletSessionHost, accountDetailHostFromProfile, PasswordRequiredError, type HostTransactionResult, sendOutcomeToHostResult, type RewardsHost, type SponsorStakingHost } from '@sponsorcoin/merit-wallet';
import { persistedTimeoutMs } from '@sponsorcoin/merit-wallet';
import { type AssetListEntry } from '@sponsorcoin/spcoin-panels';
import { APP_TYPE } from '@sponsorcoin/spcoin-common';
import {
  ExchangeProviderCore,
  DisplayStackProvider,
  buildDefaultExchangeContext,
  deriveStandardBootPanelState,
  clone as cloneContext,
  type ExchangeProviderHost,
  PanelBootstrap,
  loadSpCoinDeploymentMap,
  setHostApiBase,
  disableHostApi,
  getPreferredSpCoinContractAddress,
  fetchServerActiveSpCoin,
  type ExchangeContextWalletSource,
  collectRefreshAddresses,
  invalidateSponsorReadCaches,
  invalidateSponsoredAmount,
  invalidateAllStakedFromSponsors,
} from '@sponsorcoin/spcoin-exchange-engine';
import {
  extensionExchangeContextStorageExtensions,
  extensionExchangeContextWriteExtensions,
} from './src/exchangeContextStorage';
import { readDisplayStackRaw, makeSyncDisplayStackStorage } from './src/displayStackStorage';
// 2026-09-30 (docs/design/visibilityEnumDesign.txt, Stage A) — panelStore's
// own chrome.storage.local persistence + boot seeding.
import {
  readPanelVisibilityAndLegacy,
  bootstrapPanelVisibility,
} from './src/panelVisibilityStorage';
import { listConfiguredNetworks } from '@sponsorcoin/spcoin-feeds/networks';
import { fetchAccountMetadata, getAccountAvatarURL } from '@sponsorcoin/spcoin-feeds/accounts';
import { openOrFocusApp } from './src/openApp';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { registerExtensionEngineHosts } from './src/engineHosts';
import { ActiveSpCoinLoader } from './src/ActiveSpCoinLoader';
import { extensionTradeHost } from './src/tradeHost';

// 2026-10-11 (row 13): the shared panels' hooks (quotes, balances) read through React Query; one client for the side panel.
const queryClient = new QueryClient();
import { readOpenTarget, writeOpenTarget, urlForOpenTarget, type OpenTarget } from './src/openTargetStorage';
import { readMeritWalletUiState, writeMeritWalletUiState } from './src/meritWalletUiStorage';
import {
  readMeritWalletConfigState,
  writeMeritWalletConfigState,
  passwordDescriptionFor,
  syncDescriptionFor,
  extensionDownloadPathFor,
  type MeritWalletConfigState,
} from './src/meritWalletConfigStorage';
import {
  getEngineSetters,
  readEngineVisibility,
  type EngineVisibility,
} from './src/meritWalletConfigEngineStore';
import { MeritWalletConfigBridge } from './src/MeritWalletConfigBridge';
import { getCachedAccountIconDataUrl } from './src/accountIconCache';
import { chromeIconCacheStorage } from './src/chromeIconCacheStorage';
import { loadExtensionAccountProfile } from './src/accountProfile';
import { hydrateAccountFromAddress } from './src/hydrateAccountFromAddress';
import { TransactionConfirmOrchestrator } from './src/TransactionConfirmOrchestrator';
import { TransferApprovalHost } from './src/TransferApprovalHost';
import { sendNativeMerit } from './src/sendNative';
import { signMessageWithVault } from './src/localSigning';
import { encodeFunctionData } from 'viem';
import { runSpCoinReadStep } from './src/runSpCoinReadStep';
import { buildMeritTradeExecutorContext } from './src/tradeExecutorMerit';
import { makeFetchBalance } from './src/fetchBalance';
import { rpcUrlForChain } from './src/chainRpc';
import { makeResolveAssetAddress } from './src/resolveAssetAddress';
import { SPOIN_STAKE_ABI } from './src/spCoinStakeAbi';
import { executeClaimTransaction, SPOIN_CLAIM_ABI } from './src/executeClaimTransaction';
import { parseAbi } from 'viem';


// 2026-10-13 (docs/connectionDesign.txt item 12): bring a Ledger the person granted earlier back after a reload (no prompt).
restoreLedger();

// docs/meritMigration.txt row 27: the Hardhat RPC is the wallet's network registry's (src/chainRpc.ts), the one place it is written; this file had its own copy of the URL and of the V0 spCoin address.

// 2026-10-03 — token balance reader for every balance row (see src/fetchBalance.ts). 2026-10-08 (row 5): one reader per chain, chosen by
// the ACTIVE network instead of always the Hardhat proxy (src/chainRpc.ts names the endpoints). Each reader is built once and cached so
// its identity stays stable: MeritWallet re-fetches whenever this prop's identity changes. No RPC for a chain means no reader (balances
// read as unavailable rather than coming from the wrong chain).
const fetchBalanceByChain = new Map<number, ReturnType<typeof makeFetchBalance>>();
function fetchBalanceFor(chainId: number): ReturnType<typeof makeFetchBalance> | undefined {
  const rpc = rpcUrlForChain(chainId);
  if (!rpc) return undefined;
  let reader = fetchBalanceByChain.get(chainId);
  if (!reader) {
    reader = makeFetchBalance(rpc);
    fetchBalanceByChain.set(chainId, reader);
  }
  return reader;
}

// 2026-09-16 — real data, added on request ("network connect and
// activeAccount initialization"). Only Hardhat has any real keystore
// accounts today (testAccounts.json is Hardhat-only, see
// spcoin-feeds/accounts' own doc comment), so it's the only sensible
// "active" default until a real wallet-connection flow exists — not a
// placeholder value, but not a live-connection read either. Both fetches
// go through urlForOpenTarget(openTarget) — the SAME Local/Prod toggle the
// Open button already uses (openTargetStorage.ts) — so real data always
// comes from whichever app instance this side panel is actually pointed
// at, not a hardcoded origin.
const MERIT_WALLET_HARDHAT_CHAIN_ID = 31337;
// 2026-10-15 (docs/design/spcoinPackagesDesign.txt 8.5.6): the extension follows the wallet's ACTIVE network. The chain is shared state (the worker keeps it: merit/network/get and set); the RPC comes from the network registry (src/chainRpc.ts) and the spCoin
// address from the bundled deployment map, both per chain. Hardhat (31337) is only the DEFAULT chain, and the only one with a built-in fallback below.
let activeChainId: number = MERIT_WALLET_HARDHAT_CHAIN_ID;
// 2026-10-09 (docs/authenticationDesign.txt row 6): the extension's authenticator registry (localVault). Read-only handle for diagnostics and the live checks (scripts/extensionRequests.cjs).
(globalThis as unknown as { __spcoinAuthenticators?: typeof extensionAuthenticatorRegistry }).__spcoinAuthenticators = extensionAuthenticatorRegistry;


// 2026-10-05 — resolves an address typed into a list's ADDRESS_PANEL that isn't one of the loaded rows
// (see src/resolveAssetAddress.ts). Module scope for a stable identity; the app origin follows the
// open-target setting, so it reads currentBaseUrl, which every render refreshes.
let currentBaseUrl = '';
// who is waiting for the wallet to be unlocked (shown on the login page); refreshed while the wallet is locked
let lockedRequestNotice = '';
const assetResolvers = new Map<number, ReturnType<typeof makeResolveAssetAddress>>();
// one resolver per chain, picked when it is called: the active chain can change while the panel is open
const resolveAssetAddress: ReturnType<typeof makeResolveAssetAddress> = (...args) => {
  const chainId = activeChainId;
  let resolver = assetResolvers.get(chainId);
  if (!resolver) {
    resolver = makeResolveAssetAddress({ rpcUrl: chainRpcUrl(chainId), chainId, getBaseUrl: () => currentBaseUrl });
    assetResolvers.set(chainId, resolver);
  }
  return resolver(...args);
};


// 2026-10-07 — the REAL active spCoin address, read from the web app's saved ExchangeContext
// (GET /api/exchangeContext?key=<account> -> apiCoreSyncedMembers.activeTokens.activeSpCoinAddress). The V0
// constant above has no contract on the fork (eth_getCode is empty), so every spCoin read and the SPONSOR tab's
// "Sponsor Staked spCoins" balance came back empty/0. The constant stays only as a last-resort fallback.
// 2026-10-09 (docs/nodeSourceMigrationPlan.txt row 25): the default no longer needs the web app. The spCoin deployment map is bundled (the data package, src/bundledFeedData.json), the engine's registry answers
// "which spCoin is deployed on this chain" from it, and the newest deployment is the starting point; the synced value from the web app (below) only REFINES it when the hosted app answers.
loadSpCoinDeploymentMap(bundledFeedData['/resources/data/networks/spCoinDeployment.json']);
let activeSpCoinAddress: string | undefined = getPreferredSpCoinContractAddress(activeChainId);
let activeSpCoinLoadedFor = '';
const NO_SPCOIN_ADDRESS = '0x0000000000000000000000000000000000000000';
const spCoinAddress = (): string => activeSpCoinAddress ?? NO_SPCOIN_ADDRESS;
/** The RPC of a chain (default: the active one): the registry's, and for Hardhat the proxy above when the registry has none. No RPC means no reads for that chain. */
const chainRpcUrl = (chainId: number = activeChainId): string => rpcUrlForChain(chainId) ?? '';
let spCoinContractCache: { key: string; value: never } | undefined;
const spCoinContractNow = (): never => {
  const key = `${activeChainId}|${spCoinAddress()}`;
  if (spCoinContractCache?.key !== key) spCoinContractCache = { key, value: { address: spCoinAddress() as `0x${string}`, chainId: activeChainId, name: 'Sponsor Coin', symbol: 'SPCOIN', decimals: 18, balance: 0n } as never };
  return spCoinContractCache.value;
};
/** The wallet moved to another network: the chain, the spCoin deployment on it and the per-account spCoin lookup all follow. */
function setActiveChain(next: number): void {
  if (next === activeChainId) return;
  activeChainId = next;
  activeSpCoinAddress = getPreferredSpCoinContractAddress(next);
  activeSpCoinLoadedFor = '';
}

async function loadActiveSpCoinAddress(): Promise<string | undefined> {
  // docs/meritMigration.txt row 36: the engine's loader answers from the bundled snapshot (src/bundledFeeds.ts registers the route). The branch that read the hosted app's /api/exchangeContext is gone: baseUrl is the empty string, so it could never run.
  return fetchServerActiveSpCoin(activeChainId);
}

// Initial ExchangeContextWalletSource, disconnected — a plain object, not
// a hook, since this file isn't a React component (renderWallet's own
// `walletSource` local variable is what actually varies now, Stage 2.c;
// this constant is just its starting value). `ready: true` so
// LiteExchangeProvider's boot effect fires immediately, same as wagmi's
// own "settled, disconnected" state.
const DISCONNECTED_WALLET_SOURCE: ExchangeContextWalletSource = {
  ready: true,
  address: undefined,
  isConnected: false,
  chainId: MERIT_WALLET_HARDHAT_CHAIN_ID,
};

// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt row 4, S2b-1): buildNetworkRows and fetchAccountGroups were deleted from this file.
// They were copies of what @sponsorcoin/merit-wallet's own self-fetch already does (chainId + baseUrl + storage props below), and the
// fetchAccountGroups copy still marked the FIRST account active, which made the header show an account nobody had selected.
// The active account is now the host's activeAccountAddress (walletSource.address) and the active network is activeChainId.


// 2026-09-29, stage 8 of spcoin-nextjs-front-end's docs/meritWalletConvergence.txt — withAssetIcons/buildRecipientRows/buildTokenRows
// removed from here: MeritWallet self-fetches tokenRows/recipientRows (and, since 2026-10-08, accountGroups/networkRows too).

// 2026-09-14 — simplified further, on direct request ("the extension
// should embed just MeritWallet.tsx"). Previously this file hand-assembled
// WalletHeader/WalletAccountHeader/PanelTitle/MenuTabHeaderBar/the 5 tab
// panels into MeritWallet's slots itself — that composition now lives
// inside MeritWallet.tsx (@sponsorcoin/spcoin-panels) itself, so this file
// just renders the one component. See that file's own doc comment for the
// full reasoning.

// 2026-09-10, on request (switch from a persistent window to a real
// Chrome side panel — see background.ts's own comment for the full
// reasoning). chrome.sidePanel.close() is the side-panel equivalent of
// window.close() (which doesn't apply here; a side panel isn't a
// separate window object) — confirmed against the official API
// reference. Requires Chrome 141+; caught rather than thrown on an older
// browser, since failing to auto-close silently is a far smaller problem
// than an uncaught rejection breaking the click handler entirely.
const closeSidePanel = () => {
  void chrome.sidePanel
    .close({ windowId: chrome.windows.WINDOW_ID_CURRENT })
    .catch((error) => console.error('Failed to close side panel:', error));
};

// 2026-09-14, on request ("the close X is fine in the web, but it has no
// purpose in the extension... replace that with [www.png]... onClick, do
// the exact same as the Open button") — originally pulled out of a
// separate bottom #open-app button's own click listener so both it and
// this handler shared one definition; that button itself was removed
// later the same day ("totally remove the Open Button" — redundant once
// this header icon did the exact same thing), so this is now the only
// caller.
const handleOpenApp = () => {
  void openOrFocusApp().then(() => closeSidePanel());
};

// titleBadgeSrc/wwwIconUrl: WalletHeader's own defaults point at the web
// app's `/assets/miscellaneous/...` — an absolute, page-relative path that
// only resolves against sponsorcoin.org's own origin. Inside the extension
// (chrome-extension://<id>/...) that 404s silently, showing as broken
// squares — exactly why these props exist (see WalletHeader.tsx's own doc
// comment). chrome.runtime.getURL turns each bundled icon into a real,
// resolvable extension URL.
//
// 2026-09-21, on direct request — real regression + real fix, not a
// cosmetic revert. An earlier pass this same day removed `wwwIconUrl`
// entirely, reasoning that a caller-supplied `closeIconSrc` override was
// fragile (easy to accidentally drop, which is exactly what had just
// happened) — but the actual fix for "easy to accidentally drop" is a
// real `APP_TYPE` flag deciding this centrally in WalletHeader.tsx
// itself (@sponsorcoin/spcoin-common's new appType.ts, shared node_source
// between this repo and spcoin-nextjs-front-end), not removing the
// feature. Restored here, now passed alongside `appType:
// APP_TYPE.EXTENSION` below rather than as a bare `closeIconSrc`
// override — WalletHeader.tsx only honors it when `appType` says this
// really is the extension.
const brandLogoUrl = chrome.runtime.getURL('assets/meritWallet.png');
const wwwIconUrl = chrome.runtime.getURL('assets/www.png');
// 2026-09-15 — same reasoning, for AssetListRow's own info.png (the
// "TOKEN META" list's per-row info button, MeritWallet's own infoIconSrc
// prop) — confirmed live via a real loaded-extension Playwright check
// before this fix existed: naturalWidth 0, a genuine 404, not a guess.
const infoIconUrl = chrome.runtime.getURL('assets/info.png');

// 2026-09-14, on request ("persist the merit wallet" / the Open button's
// Local-vs-Prod target) — a Chrome side panel's whole document, this
// script included, is torn down on close and rebuilt from scratch on the
// next open (unlike a persistent background page), so MeritWallet's own
// menuOpen/openTarget state (plain useState — see that file's own doc
// comments) would otherwise reset to its defaults every time.
// chrome.storage.local (openTargetStorage.ts / meritWalletUiStorage.ts)
// is this extension's own persistence, read once here before the first
// render and written back on every change the wallet reports. activeTab
// used to live here too — moved 2026-09-21 (Path A) onto the real
// panel-tree engine's own persistence instead, see
// meritWalletUiStorage.ts's own header comment for why.
async function renderWallet() {
  const walletRoot = document.getElementById('wallet-root');
  if (!walletRoot) return;
  const root = createRoot(walletRoot);

  const [openTarget, uiState, persistedDisplayStack, panelVisibility, persistedConfig] = await Promise.all([
    readOpenTarget(),
    readMeritWalletUiState(),
    readDisplayStackRaw(),
    readPanelVisibilityAndLegacy(),
    readMeritWalletConfigState(),
  ]);
  // 2026-09-30 (docs/design/visibilityEnumDesign.txt, Stage A) — panelStore's
  // own persisted panel-visibility state. Seeded HERE, inside the same
  // pre-render storage reads as everything else, because panelStore's read
  // sink is synchronous while chrome.storage.local is not (the same
  // sync/async bridge displayStackStorage.ts exists for) and because
  // LiteExchangeProvider's first non-null render already mounts components
  // that read panelStore. Idempotent — see bootstrapPanelVisibility's own
  // doc comment.
  bootstrapPanelVisibility(panelVisibility.persisted, panelVisibility.legacy);
  // 2026-10-11 (owner: "I do not want any dependency on the web app"): the extension uses its own bundle and the chain, never the hosted app. `baseUrl` is what the libraries fetch hosted data from: empty, so none of them requests anything from the web app;
  // the Open button has its own address (src/openApp.ts, urlForOpenTarget) and is unaffected.
  const baseUrl = '';
  void openTarget;
  currentBaseUrl = baseUrl;
  // 2026-10-11 (docs/nodeSourceMigrationPlan.txt row 2, capability "api"): the hosted app's origin, registered once for every library that reads the hosted API.
  disableHostApi();
  // 2026-10-11 (row 13): the engine's trade hooks, registered once so the shared Sponsor panel can run here.
  registerExtensionEngineHosts();
  // 2026-09-21, Path A — DisplayStackProvider's own storage contract is
  // synchronous (see displayStackStorage.ts's own header comment for why
  // this needs pre-resolving here rather than passed as an async
  // function), so the real chrome.storage.local-backed value is read
  // above, alongside this file's other storage reads, and wrapped into a
  // sync closure once, here, rather than on every render() call.
  const displayStackStorage = makeSyncDisplayStackStorage(persistedDisplayStack);

  // 2026-10-09 (docs/nodeSourceMigrationPlan.txt row 3): the extension mounts the SAME provider the web app does (the engine's ExchangeProviderCore) instead of its own smaller LiteExchangeProvider. This host
  // is what makes it the extension's: it builds the first context from the stored blob or the minimal default, never signs with a server keystore, mounts the display stack with the extension's storage, and
  // turns OFF the web's account / token hydration (ActiveAccountHydrator hydrates with the hosted app's base URL) while keeping the active account following the wallet source.
  const providerHost: ExchangeProviderHost = {
    initContext: async (stored, chainId) => {
      const base = (stored && typeof stored === 'object' ? cloneContext(stored as never) : buildDefaultExchangeContext(chainId)) as ReturnType<typeof buildDefaultExchangeContext>;
      base.settings = base.settings ?? {};
      base.apiCoreSyncedMembers = base.apiCoreSyncedMembers ?? buildDefaultExchangeContext(chainId).apiCoreSyncedMembers;
      base.apiCoreSyncedMembers = { ...base.apiCoreSyncedMembers, network: { ...base.apiCoreSyncedMembers.network, appChainId: chainId } };
      return base;
    },
    isMeritAuth: () => false,
    // the extension's profile loader (its bundle, never the hosted app): the provider's one effect for the ACTIVE account calls it
    loadAccountProfile: (address) => loadExtensionAccountProfile(address, baseUrl),
    wrap: (children) => React.createElement(DisplayStackProvider, { storage: displayStackStorage, children }),
    features: { hydrateActiveAccount: false, hydrateRoleAccounts: false, normalizeListLogos: false, tokenRegistryRefresh: false, injectedWalletListener: false, followWalletMinimal: true },
  };

  // Data lives outside React (this file isn't a component): each change just re-runs render() against the same root, the pattern
  // React's own docs use for a plain-script root.
  // 2026-10-08 (docs/meritWalletNpmDesignToDo.txt row 5): the refresh sequence (refreshing flag, re-entrancy guard, refreshToken bump after
  // the reload) is @sponsorcoin/merit-wallet's createWalletRefresh, the same code the web adapter runs through useWalletRefresh. This file
  // supplies only what is extension-specific: reload the keystore lock status. MeritWallet's own self-fetch re-runs when refreshToken
  // changes (it can tell "the user asked for fresh data" apart from "still the same mount"), which is what refetches accounts, networks,
  // tokens and recipients with forceRefresh.
  // 2026-10-08 (table row 15): the unlock gate over the vault in the background worker, the shared createWalletSession from
  // @sponsorcoin/merit-wallet (same password rules and messages as the web app). The gate shows only when a vault EXISTS and is locked; creating
  // the vault (setup) is not forced on anyone until the hosted-app accounts are retired (table row 23).
  type VaultReply = { ok: boolean; initialized?: boolean; unlocked?: boolean; mnemonic?: string; error?: string; message?: string };
  const vaultCall = (message: unknown) => chrome.runtime.sendMessage(message) as Promise<VaultReply>;
  // docs/meritMigration.txt row 21: the Config Time Limit IS the vault's auto-lock time. It used to be stored and shown but never applied here, so the vault locked after its built-in 15 minutes whatever the picker said.
  // The worker keeps the minutes it is given and applies them again after a restart (src/walletBackground.ts).
  const applyTimeLimit = (hours: number) => { void vaultCall({ type: 'merit/vault/setAutoLock', minutes: persistedTimeoutMs(hours) / 60_000 }).catch(() => undefined); };
  applyTimeLimit(persistedConfig.persistedPasswordTimeoutHours);
  const vaultSession = createWalletSession(
    {
      status: async () => {
        const reply = await vaultCall({ type: 'merit/vault/status' }).catch(() => undefined);
        return reply?.ok ? { initialized: !!reply.initialized, unlocked: !!reply.unlocked } : null;
      },
      create: async (password) => {
        const reply = await vaultCall({ type: 'merit/vault/create', password });
        if (!reply.ok) throw new Error(reply.message || 'The wallet could not be created.');
        return { recoveryPhrase: reply.mnemonic };
      },
      unlock: async (password) => {
        const reply = await vaultCall({ type: 'merit/vault/unlock', password });
        if (reply.ok) return true;
        if (reply.error === 'wrong-password') return false;
        throw new Error(reply.message || 'The wallet could not be unlocked.');
      },
      lock: async () => {
        await vaultCall({ type: 'merit/vault/lock' });
      },
    },
    () => render(),
  );
  void vaultSession.refresh();
  chrome.runtime.onMessage.addListener((message: { type?: string }) => {
    if (message?.type === 'merit/vault/changed') void vaultSession.refresh();
  });
  // While locked, look for a request that is waiting (a connect, a signature) and name the site on the login page.
  async function refreshLockedRequestNotice() {
    try {
      const status = (await chrome.runtime.sendMessage({ type: 'merit/vault/status' })) as { unlocked?: boolean } | undefined;
      let text = '';
      if (status && status.unlocked === false) {
        const reply = (await chrome.runtime.sendMessage({ type: 'merit/signing/pending' })) as { pending?: Array<{ kind: string; origin: string }> } | undefined;
        const first = (reply?.pending ?? []).find((p) => p.origin && p.origin !== 'wallet');
        if (first) text = `${first.origin} is waiting to ${first.kind === 'connect' ? 'connect' : 'be approved'}. Log in to continue.`;
      }
      if (text !== lockedRequestNotice) {
        lockedRequestNotice = text;
        render();
      }
    } catch {
      /* the worker may be restarting */
    }
  }
  window.setInterval(() => void refreshLockedRequestNotice(), 1500);
  void refreshLockedRequestNotice();

  const walletRefresh = createWalletRefresh(
    {
      // docs/meritMigration.txt row 28: Refresh drops the cached sponsored and staked totals of the active account, the same engine function the web's Refresh runs (it used to leave them, so an old total could stay on screen). The access module's own read cache
      // is the web server's; the extension has none.
      invalidate: () => invalidateSponsorReadCaches(collectRefreshAddresses({ activeAccount: { address: walletSource.address } }), { invalidateSponsoredAmount, invalidateAllStakedFromSponsors }),
      reload: async () => {
        // nothing to reload: the lock status belonged to the retired hosted-app keystore accounts (docs/meritMigration.txt row 36)
      },
    },
    () => render(),
  );
  // The active network (chain id), the same role appChainId plays in the web app. MeritWallet self-fetches the network rows and marks
  // this one active; selecting a network row changes it (handleNetworkRowSelect).
  // 2026-10-08 (table row 18): the worker owns the active network so web pages and the side panel agree on it (MetaMask: one selected network).
  void (chrome.runtime.sendMessage({ type: 'merit/network/get' }) as Promise<{ ok?: boolean; chainId?: number }>).then((reply) => {
    if (reply?.ok && typeof reply.chainId === 'number' && reply.chainId !== activeChainId) {
      setActiveChain(reply.chainId);
      render();
    }
  }).catch(() => undefined);
  chrome.runtime.onMessage.addListener((message: { type?: string; chainId?: number }) => {
    if (message?.type === 'merit/network/changed' && typeof message.chainId === 'number' && message.chainId !== activeChainId) {
      setActiveChain(message.chainId);
      render();
    }
    return false;
  });
  startDappApprovals();
  // While this screen is open the worker holds a port to it: the port going away is how the worker learns the screen was closed, and it then rejects every page still waiting (walletProvider.ts). A worker the browser stopped
  // drops the port too; the screen is still here, so it connects again.
  const holdPortOpen = () => {
    try {
      chrome.runtime.connect({ name: 'merit-sidepanel' }).onDisconnect.addListener(() => window.setTimeout(holdPortOpen, 500));
    } catch {
      window.setTimeout(holdPortOpen, 1000);
    }
  };
  holdPortOpen();
  // The Swap tab's trade button (table row 22): price from Uniswap on-chain or the hosted 0x quote service, swap through the same executor as stake.
  // Editing the public profile of the wallet's own accounts (Account Details > Edit Profile): the hosted app's nonce / verify / save sequence, the account signing its challenge
  // with the vault behind the confirmation screen (a test account signs without it). After a save the details, header and list read the new values at once.
  // 2026-10-10 (docs/connectionDesign.txt item 2): the shared Add a Wallet/Account flow (the same menu the web app shows), over this vault. Create derives the next account
  // from the recovery phrase; Import takes a private key. Neither makes the new account the active one: the user picks it from the list (connectionDesign 2.6). The entries the
  // vault cannot offer are shown disabled with the reason.
  // docs/createWalletAccountDesign.txt C6: the keys this panel can add are the extension vault's only; a call aimed at another wallet is refused in words.
  const onlyOwnVault = (targetId?: string) => {
    if (targetId && targetId !== 'localVault') throw new Error(`${walletName(targetId)} cannot be added to from the extension.`);
  };
  const addAccountHost: AddAccountHost = {
    targets: ['localVault'],
    createAccount: async (targetId) => {
      onlyOwnVault(targetId);
      await vaultAccountsApi.addDerived();
      vaultRowsStale = true;
      await loadVaultAccounts();
    },
    importAccount: async (privateKey, targetId) => {
      onlyOwnVault(targetId);
      await vaultAccountsApi.importPrivateKey(privateKey);
      vaultRowsStale = true;
      await loadVaultAccounts();
    },
    // another Secret Recovery Phrase kept beside the first, like MetaMask's "Import a Secret Recovery Phrase" (the vault keeps several)
    importWallet: async (mnemonic, targetId) => {
      onlyOwnVault(targetId);
      await importVaultWallet(mnemonic);
      vaultRowsStale = true;
      await loadVaultAccounts();
    },
    // MetaMask answers in its own window; the extension reaches it through one tab on the web app's relay page
    connectApprover: async (entry) => {
      if (entry === 'connectHardware') throw new Error('Choose a device first.');
      if (entry !== 'connectMetaMask') throw new Error('You are already in the Merit extension.');
      await connectExternalFromMenu(METAMASK_ID);
    },
    // "Connect a hardware wallet" asks which device (the same screen as the web app). A Ledger works over USB; a Trezor needs the web app for now.
    hardwareDevices: [
      { id: LEDGER_ID, title: 'Ledger', subtitle: ledgerTransport.isSupported() ? 'Connect with USB' : undefined, unavailable: ledgerTransport.isSupported() ? undefined : 'This browser cannot talk to a USB device.' },
      { id: 'hardware:trezor', title: 'Trezor', unavailable: 'Use the Trezor from the web app for now (its connection window cannot run inside the extension yet).' },
    ],
    connectHardwareDevice: async (id) => {
      if (id !== LEDGER_ID) throw new Error('That device is not available in the extension yet.');
      await connectExternalFromMenu(LEDGER_ID);
    },
    unavailable: {
      connectMeritExtension: 'You are already in the Merit extension.',
    },
  };
  // docs/meritMigration.txt row 18: Reset Password and Delete Wallet as functions and words; the component draws the dialogs (ChangePasswordPanel, DeleteWalletDialog).
  const walletSession: WalletSessionHost = {
    changePassword: async (oldPassword, newPassword) => {
      const reply = (await chrome.runtime.sendMessage({ type: 'merit/vault/changePassword', oldPassword, newPassword })) as { ok: boolean; error?: string; message?: string };
      if (!reply.ok) throw new Error(reply.error === 'wrong-password' ? 'Incorrect current password.' : reply.error === 'too-many-attempts' ? 'Too many incorrect passwords. Wait a moment and try again.' : reply.message ?? 'The password could not be changed.');
    },
    deleteWallet: async (password) => {
      let verified = (await chrome.runtime.sendMessage({ type: 'merit/vault/verifyPassword', password })) as { ok: boolean; error?: string; message?: string };
      // A background service that has not been reloaded yet does not know verifyPassword; checking through the (password-protected) phrase reveal gives the same answer.
      if (!verified.ok && verified.error === 'invalid-request') {
        verified = (await chrome.runtime.sendMessage({ type: 'merit/accounts/revealMnemonic', password })) as { ok: boolean; error?: string; message?: string };
      }
      if (!verified.ok) throw new Error(verified.error === 'wrong-password' ? 'Incorrect password.' : verified.error === 'too-many-attempts' ? 'Too many incorrect passwords. Wait a moment and try again.' : verified.message ?? 'The wallet could not be deleted.');
      await chrome.runtime.sendMessage({ type: 'merit/vault/wipe' });
      vaultRows = null;
      vaultRowsStale = true;
      walletSource = DISCONNECTED_WALLET_SOURCE;
      await vaultSession.refresh();
      render();
    },
    deleteButton: 'deleteWallet',
  };
  const accountProfileHost: AccountProfileHost = {
    baseUrl,
    canEdit: (address) => !!vaultRows?.some((row) => row.address.toLowerCase() === address.toLowerCase()),
    // the vault is an authenticator like any other: the profile save asks it to sign, with its own words on the confirmation screen
    signMessage: (address, message) =>
      localVaultAuthenticator.signMessage(address, message, {
        title: 'Save account profile',
        message: 'Sign in to the hosted app to save this account profile. This does not send a transaction.',
      }),
    onSaved: (address, saved, avatarChanged) => {
      void (async () => {
        const avatarSrc = await getCachedAccountIconDataUrl(getAccountAvatarURL(address), baseUrl, avatarChanged);
        const key = address.toLowerCase();
        vaultMeta.set(key, { symbol: saved.symbol || undefined, name: saved.name || undefined, iconSrc: avatarSrc ?? vaultMeta.get(key)?.iconSrc });
        accountDetail = { address, avatarSrc: avatarSrc ?? accountDetail?.avatarSrc, ...saved, recipientNetwork: accountDetail?.recipientNetwork };
        render();
      })();
    },
  };
  // docs/meritWallet row 14: the shared account detail screen (avatar, profile table, Private Key row) over this vault: the profile host above signs and says which accounts the wallet may edit; a key is revealed by the vault behind the wallet password.
  const accountDetailHost = accountDetailHostFromProfile(accountProfileHost, {
    revealPrivateKey: async (address, password) => {
      if (!password) throw new PasswordRequiredError();
      return vaultAccountsApi.exportPrivateKey(password, address);
    },
    canReveal: (address) => !!vaultRows?.some((row) => row.address.toLowerCase() === address.toLowerCase()),
  });
  // Sponsor staking (the Rewards tab's Unstake list and the Sponsor tab's "Sponsor Staked spCoins" line): contract views are read straight from the chain's RPC, an Un-Stake
  // leg is encoded here and signed by the vault behind the confirmation screen, one transaction per leg, each waited for. One stable object so the wallet does not refetch every render.
  const sponsorReadParams = () => ({ contractAddress: spCoinAddress(), rpcUrl: chainRpcUrl(), accessSource: 'local' as const, readMode: 'hardhat' as const });
  const stakingHost: SponsorStakingHost = {
    contractAddress: () => spCoinAddress(),
    read: (method, args) => runSpCoinReadStep(sponsorReadParams(), method, args, baseUrl),
    send: async (method, args) => {
      const from = walletSource.address;
      if (!from) throw new Error('Select and activate an account first.');
      const data = encodeFunctionData({ abi: SPOIN_STAKE_ABI, functionName: method, args: args as never });
      const context = buildMeritTradeExecutorContext({ rpcUrl: chainRpcUrl() }, { address: from, isConnected: true, chainId: activeChainId });
      const result = await context.executor.execute({
        to: spCoinAddress(),
        data,
        chainId: activeChainId,
        rpcUrl: chainRpcUrl(),
        display: { title: 'Un-Stake', label: method, contractAddress: spCoinAddress() } as never,
      });
      const receipt = result.receipt;
      return { hash: result.transactionHash, gasUsed: receipt ? BigInt(receipt.gasUsed) : undefined, gasPrice: receipt?.gasPrice != null ? BigInt(receipt.gasPrice) : undefined };
    },
    loadProfile: async (address) => (await hydrateAccountFromAddress(address, { baseUrl })) ?? { address },
    // read when used, and the same object while the chain and the address stay the same (the staking list refetches when its identity changes)
    get spCoinContract() {
      return spCoinContractNow();
    },
    onChanged: () => void walletRefresh.run(),
  };
  // The Rewards tab (the same card and data hook as the web app's): reads go to the hosted app's run-script route, a CLAIM is signed by the vault behind the confirmation screen.
  // 2026-10-09 (row 25): one throttled direct read of the active spCoin contract's views, shared by the reward estimate and the account record (no hosted app needed for either).
  const chainRead = throttleRead((m, a) => runSpCoinReadStep({ contractAddress: spCoinAddress(), rpcUrl: chainRpcUrl(), accessSource: 'local', readMode: 'hardhat' }, m, a, baseUrl));
  const rewardsHost: RewardsHost = {
    contractAddress: () => spCoinAddress(),
    // read when used: the active chain can change while the panel is open
    get rpcUrl() {
      return chainRpcUrl();
    },
    accessSource: 'local',
    readMode: 'hardhat',
    endpoint: `${baseUrl}/api/spCoin/run-script`,
    // Trading and Staked come straight from the contract's getAccountRecord view.
    // 2026-10-09 (docs/nodeSourceMigrationPlan.txt row 25): the reward ESTIMATES are computed here too, from direct reads of the contract's views (estimateRewards.ts, a port of the access module's calculation,
    // checked against the run-script result for 18 live accounts), so the Rewards tab needs no hosted app.
    estimate: (method, accountKey) =>
      estimateRewardsByMethod(method, { accountKey, read: chainRead }),
    readAccountRecord: (accountKey) => runSpCoinReadStep({ contractAddress: spCoinAddress(), rpcUrl: chainRpcUrl(), accessSource: 'local', readMode: 'hardhat' }, 'getAccountRecord', [{ key: 'Account Key', value: accountKey }], baseUrl),
    claim: async (method, accountKey) => {
      const result = await executeClaimTransaction({
        baseUrl,
        rpcUrl: chainRpcUrl(),
        accountKey,
        method: method as Parameters<typeof executeClaimTransaction>[0]['method'],
        abi: SPOIN_CLAIM_ABI,
        contractAddress: spCoinAddress(),
        chainId: activeChainId,
        fromAddress: accountKey,
      });
      return { transactionHash: result.transactionHash };
    },
    onClaimed: () => void walletRefresh.run(),
  };
  let onboardingOpen = false;

  // The accounts of the unlocked vault feed the account list and the active account.
  let vaultRows: Array<{ address: string; name: string }> | null = null;
  let vaultActive: string | undefined;
  // 2026-10-12 (docs/connectionDesign.txt item 9): the active account when it is one MetaMask shared with the extension (not in the vault); kept so a reload brings it back. A vault pick clears it.
  const ACTIVE_EXTERNAL_KEY = 'meritActiveExternalAccount';
  let externalActive: string | undefined = (() => {
    try {
      return window.localStorage.getItem(ACTIVE_EXTERNAL_KEY) || undefined;
    } catch {
      return undefined;
    }
  })();
  const setExternalActive = (address: string | undefined) => {
    externalActive = address;
    try {
      if (address) window.localStorage.setItem(ACTIVE_EXTERNAL_KEY, address);
      else window.localStorage.removeItem(ACTIVE_EXTERNAL_KEY);
    } catch {
      /* kept for this session only */
    }
  };
  let vaultRowsStale = true;
  // Public profile of each vault account (name, symbol, avatar) from the hosted app's account.json / avatar files, the same source the web wallet's list reads,
  // so a Hardhat test account shows as "Doggie | Hot Dog" with its picture in both apps. Accounts with no profile keep the vault's own name.
  const vaultMeta = new Map<string, { symbol?: string; name?: string; iconSrc?: string }>();
  async function enrichVaultRows(addresses: string[]) {
    await Promise.all(
      addresses.map(async (address) => {
        const key = address.toLowerCase();
        if (vaultMeta.has(key)) return;
        const [meta, iconSrc] = await Promise.all([
          fetchAccountMetadata(address, { baseUrl }).catch(() => null),
          getCachedAccountIconDataUrl(getAccountAvatarURL(address), baseUrl).catch(() => undefined),
        ]);
        vaultMeta.set(key, { symbol: meta?.symbol || undefined, name: meta?.name || undefined, iconSrc: iconSrc || undefined });
      }),
    );
    render();
  }
  async function loadVaultAccounts() {
    const status = await vaultStatus();
    if (!status.initialized || !status.unlocked) {
      vaultRows = null;
      vaultActive = undefined;
      return;
    }
    const result = await vaultAccountsApi.list();
    vaultRows = result.accounts;
    vaultActive = result.active;
    void enrichVaultRows(result.accounts.map((a) => a.address));
    // MetaMask's account stays the active one while MetaMask still shares it; otherwise the vault's choice is.
    if (externalActive && !(await isExternalAccount(externalActive))) setExternalActive(undefined);
    const wanted = externalActive ?? vaultActive;
    if (wanted && walletSource.address?.toLowerCase() !== wanted.toLowerCase()) activateAccount(wanted);
    else render();
  }
  // Delete the wallet from this device (after a confirmation); the account list falls back to setup. Used by the lock screen's reset link and Config's Delete Account.
  function resetWallet() {
    if (!window.confirm('Reset this wallet? This deletes the wallet from this device. You can only get your accounts back with your Secret Recovery Phrase.')) return;
    void chrome.runtime.sendMessage({ type: 'merit/vault/wipe' }).then(() => {
      vaultRows = null;
      vaultRowsStale = true;
      return vaultSession.refresh();
    });
  }
  // Config's Remove Account: remove the active account from the wallet. Only accounts imported by private key can go (the others come from the Secret Recovery Phrase).
  function removeActiveAccount() {
    const address = walletSource.address;
    if (!address) {
      alert('Select an account first.');
      return;
    }
    if (!window.confirm('Remove this account from the wallet? You can add it again only with its private key.')) return;
    void vaultAccountsApi
      .remove(address)
      .then(async () => {
        walletSource = { ...walletSource, address: undefined, isConnected: false };
        vaultRowsStale = true;
        await loadVaultAccounts();
      })
      .catch((error: unknown) => alert(error instanceof Error ? error.message : 'The account could not be removed.'));
  }
  // 2026-10-03 — Merit Wallet Config tab state. Two halves with different
  // sources of truth, matching how the web app's own useMeritWalletConfig
  // splits them: the options below live in chrome.storage.local (this
  // file's established pre-render-read pattern, same as openTargetStorage
  // / meritWalletUiStorage), while the two exchange-engine toggles are NOT
  // stored here at all — they are live reads of the real panelStore,
  // written through the engine's own setPanelVisible by
  // MeritWalletConfigBridge below. See meritWalletConfigStorage.ts and
  // meritWalletConfigEngineStore.ts.
  // 2026-10-08 (row 6): the config state and the set / persist / notify sequence are @sponsorcoin/merit-wallet's createWalletConfig, the same code
  // the web app runs through useWalletConfig. This file supplies only the storage (chrome.storage.local) and re-renders on every change.
  const walletConfig = createWalletConfig(
    {
      read: () => persistedConfig,
      write: (patch) =>
        writeMeritWalletConfigState(patch).then(
          () => undefined,
          (error) => {
            console.error('Failed to persist Merit Wallet config:', error);
          },
        ),
      onChange: (patch, next) => {
        if (patch.persistedPasswordTimeoutHours !== undefined) applyTimeLimit(next.persistedPasswordTimeoutHours);
      },
    },
    () => render(),
  );
  let engineVisibility: EngineVisibility = readEngineVisibility();
  // Phase B.2 Stage 2.c — real wallet-source state, same "plain outer-scope
  // variable, mutated then render() called" shape as every other piece of
  // state in this file (walletSource, activeChainId, etc.), not React state.
  let walletSource: ExchangeContextWalletSource = DISCONNECTED_WALLET_SOURCE;
  // Phase B.2 Stage 4 follow-up — the SEND tab's real, controlled amount
  // field (MeritWallet.tsx's own sendAmount/onSendAmountChange props, this
  // session) and busy flag while a real send is in flight.
  let sendAmount = '';
   let sendBusy = false;

  // 2026-09-16 — ACCOUNT_PANEL slice: which account's details are currently
  // being viewed (set the moment the avatar icon is clicked, independent
  // of whether the fetch below has resolved yet — see MeritWallet's own
  // accountDetail prop doc comment for why `address` gates trust here).
  let accountDetail:
    | {
        address: string;
        avatarSrc?: string;
        name?: string;
        symbol?: string;
        email?: string;
        website?: string;
        description?: string;
        recipientNetwork?: number[];
      }
    | null = null;
  function render() {
    if (vaultSession.getState().phase === 'setup') onboardingOpen = true;
    const vaultPhase = vaultSession.getState().phase;
    if (vaultPhase === 'unlocked' && vaultRowsStale) {
      vaultRowsStale = false;
      void loadVaultAccounts().catch(() => undefined);
    } else if (vaultPhase === 'locked' && vaultRows) {
      vaultRows = null;
      vaultRowsStale = true;
    }
    // Load the active spCoin address once per account (and base URL), then re-render with it.
    const loadKey = `${baseUrl}|${walletSource.address ?? ''}`;
    if (walletSource.address && loadKey !== activeSpCoinLoadedFor) {
      activeSpCoinLoadedFor = loadKey;
      void loadActiveSpCoinAddress().then((address) => {
        if (address && address !== activeSpCoinAddress) {
          activeSpCoinAddress = address;
          render();
        }
      });
    }
    root.render(
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
      React.createElement(
        ExchangeProviderCore,
        {
          walletSource,
          storageExtensions: extensionExchangeContextStorageExtensions,
          writeExtensions: extensionExchangeContextWriteExtensions,
          bootExtensions: { derivePanelState: deriveStandardBootPanelState as never },
          host: providerHost,
        },
        React.createElement(PanelBootstrap),
        // Phase B.2 Stage 3 — hydrates activeAccount's real name/logo/etc
        // once a wallet source resolves to a real address; no UI of its
        // own (see hydrateActiveAccount.ts's own doc comment).
        // 2026-10-11 (row 13): the active spCoin (bundled) and its contract metadata go into the exchange context, where the shared Sponsor panel reads them.
        React.createElement(ActiveSpCoinLoader),
        // 2026-10-03 — supplies the Config tab's two exchange-engine
        // handlers. setPanelVisible is a hook, so the writes have to come
        // from inside the React tree; this component's only job is to
        // register them into meritWalletConfigEngineStore and call back
        // after each write so render() re-reads panelStore. Same "no UI of
        // its own, mounted as a sibling" shape as ActiveAccountHydrator
        // above.
        React.createElement(MeritWalletConfigBridge, {
          onEngineVisibilityChange: () => {
            engineVisibility = readEngineVisibility();
            render();
          },
        }),
        // Phase B.2 Stage 4.c — renders TransactionConfirmPanel (always an
        // explicit Approve/Reject gate — see pendingSignRequestStore.ts's
        // own header comment for why this doesn't mirror the web app's
        // auto-approve default) whenever pendingSignRequestStore has a
        // pending request. No real producer wired in yet (Stage 4.b's
        // server-side allowlist isn't implemented, Stage 4.d hasn't
        // extended cross-origin trust to `sign`) — mounted now so it's a
        // real, ready capability the moment that lands. Sibling of
        // MeritWallet/PasswordPanel below, not nested under either, since
        // it needs to overlay regardless of which of those two is showing.
        React.createElement(TransactionConfirmOrchestrator),
        React.createElement(TransferApprovalHost),
        // 2026-10-19 (docs/meritMigration.txt rows 27 / 28): this host draws no wallet screen. First-run setup (lock.onboarding) and the legacy unlock prompt (the component's own lock props) are data and functions the component draws itself.
        React.createElement(MeritWalletHostView, {
            host: {
              layout: {
                refreshToken: walletRefresh.getState().refreshToken,
                // A Chrome side panel is closer to the web app's own docked/split-
                // pane mode (full-height, no floating-dialog corners) than its
                // floating popup mode — see MeritWallet.tsx's own `docked` doc
                // comment. fullWidth drops the web app's 364px cap, which assumes a
                // fixed-width floating context — wrong here, where the panel itself
                // is already narrow and user-resizable.
                docked: true,
                fullWidth: true,
                titleBadgeSrc: brandLogoUrl,
                // 2026-09-21, on direct request — `onClose` stays wired to the
                // same handler as the (removed) bottom Open button: this means
                // "open the real web app" (which closes the side panel as a
                // result). `appType: APP_TYPE.EXTENSION` + `wwwIconSrc` is the
                // real, centralized mechanism (WalletHeader.tsx/@sponsorcoin/
                // spcoin-common's new APP_TYPE flag) that tells WalletHeader to
                // show `wwwIconUrl` instead of its own default X — see this
                // file's own `wwwIconUrl` comment above for why this replaced a
                // bare `closeIconSrc` override.
                onClose: handleOpenApp,
                appType: APP_TYPE.EXTENSION,
                wwwIconSrc: wwwIconUrl,
                infoIconSrc: infoIconUrl,
                // 2026-09-16 — real refresh, added on request. Forces a real
                // re-fetch of the account list and network icons (bypassing the
                // icon cache's TTL via forceRefresh), not just a spinner —
                // previously unwired, so clicking this icon did nothing at all.
                onRefresh: () => void walletRefresh.run(),
                refreshing: walletRefresh.getState().refreshing,
              },
              uiState: {
                // 2026-09-21, Path A — initialActiveTab/onActiveTabChange
                // deliberately NOT wired here anymore. MeritWallet.tsx's
                // activeTab now comes from the real engine's own
                // usePanelTree()/activeMainOverlay, and that engine already
                // persists which tab was active via its own storage extension
                // (LiteExchangeProvider's default window.localStorage) — wiring
                // this too would just be a second, separately-written copy of
                // the same fact. See meritWalletUiStorage.ts's own header
                // comment for the full reasoning.
                initialMenuOpen: uiState.menuOpen,
                onMenuOpenChange: (open: boolean) => void writeMeritWalletUiState({ menuOpen: open }),
                initialOpenTarget: openTarget,
                onOpenTargetChange: (target: OpenTarget) => void writeOpenTarget(target),
              },
              data: {
                // 2026-10-13: where the wallet asset files (public/assets/wallets: the wallet pill, the wallet list, the wallet panel) are served from: the web app the Local / Prod toggle points at.
                walletAssetBaseUrl: urlForOpenTarget(openTarget),
                // The host's real active account; '' means none selected, so the header reads "Select Account".
                activeAccountAddress: walletSource.address ?? '',
                // 2026-10-11 (authenticationDesign.txt section 15.7, W1): the wallet (its backends behind one object); the lock screen, the lock button, the authentication type and the Wallet Security section come from it.
                wallet: extensionWallet,
                // 2026-10-12 (docs/connectionDesign.txt items 6 / 7): the account list is derived from the wallet, one group per approver (here the vault), with the same badges and the same connect operation as every host; the host only
                // says how its active account is set and cleared and what it knows about each account (the saved profile: symbol, name, avatar).
                approverHost: {
                  // the vault of this extension IS the Merit wallet here: listed first, always connected
                  nativeWalletId: 'localVault',
                  setActiveAccount: async (address: string) => {
                    await setActiveAccountOf(address);
                  },
                  clearActiveAccount: () => {
                    setExternalActive(undefined);
                    walletSource = { ...walletSource, address: undefined, isConnected: false };
                    render();
                  },
                  describeAccount: (address: string) => vaultMeta.get(address.toLowerCase()),
                },
                // 2026-09-29, stage 8 — tokenRows/recipientRows no longer passed
                // explicitly; MeritWallet self-fetches them via these 4 props
                // instead (same underlying spcoin-feeds calls this file used to
                // make by hand — see the removed buildTokenRows/buildRecipientRows
                // comment above). accountGroups/networkRows are self-fetched now too.
                chainId: activeChainId,
                baseUrl,
                storage: chromeIconCacheStorage,
                fetchBalance: fetchBalanceFor(activeChainId),
                resolveAssetAddress,
                rewardsHost,
                stakingHost,
              },
              selection: {
                // the vault's rows are chosen through the derived list's connect; the old handler stays only for the (unlocked-keystore) fallback list
                onAccountRowSelect: vaultRows ? undefined : handleAccountRowSelect,
                onNetworkRowSelect: handleNetworkRowSelect,
                onAccountIconClick: (address: string) => void handleAccountIconClick(address),
                accountDetail,
                accountDetailHost,
                addAccountHost,
              },
              actions: {
                // Phase B.2 Stage 4 follow-up — the real SEND tab wiring.
                sendAmount,
                onSendAmountChange: (value: string) => {
                  sendAmount = value;
                  render();
                },
                sendBusy,
                onSendSubmit: (params: {
                  recipientAddress?: string;
                  tokenAddress?: string;
                  amount: string;
                  decimals?: number;
                  tokenSymbol?: string;
                 }) => handleSendSubmit(params),
                // 2026-10-11 (row 13): the Sponsor tab is the shared panel, driven by the exchange context.
                tradeHost: extensionTradeHost,
              },
              slots: {
                configTestAccounts: {
                  api: vaultTestAccountsApi,
                  authenticationType: AuthenticationType.VAULT,
                  onChanged: () => {
                    vaultRowsStale = true;
                    render();
                  },
                },
              },
              lock: {
                // 2026-10-08 (table row 23): the lock gate is the component's own: while the vault is locked it shows the password screen in place of everything.
                onResetWallet: resetWallet,
                // 2026-10-14: a site asked to connect (or sign) while the wallet is locked: say so on the login page, like MetaMask's "unlock to continue"; the connect page follows the login.
                passwordNoticeText: lockedRequestNotice || undefined,
                passwordIconSrc: brandLogoUrl,
                // First-run setup: the component draws the "Set up your wallet" screen instead of the wallet while this is set (create a wallet, import by recovery phrase, restore a backup). It stays up through the recovery-phrase
                // step even though the vault already exists by then (the phase is no longer 'setup').
                onboarding:
                  (vaultSession.getState().phase === 'setup' || onboardingOpen)
                    ? {
                        createWallet: vaultOnboarding.createWallet,
                        importWallet: vaultOnboarding.importWallet,
                        restoreBackup: vaultOnboarding.restoreBackup,
                        // Close only after the status says a vault exists, or render() would re-open setup from the stale phase.
                        onDone: () => {
                          void vaultSession.refresh().then(() => {
                            onboardingOpen = false;
                            render();
                          });
                        },
                      }
                    : undefined,
              },
              config: {
                // 2026-10-13: the swap and agent wiring this block once said was still to come is done (the shared swap flow in src/swapHost.ts, the agent hydration in
                // src/sponsorPanelHost.ts); the dead handler and its state (handleSponsorSwapSubmit, swapAmount, swapBusy, sponsorSwapBusy) were removed.
                // 2026-09-27, Phase C — REWARDS tab claim/estimate wiring for
                // ManageSponsorshipsPanel. Display strings parsed from
                // accountRecord via parseRewardDisplay(); claim callbacks use the
                // extension's executeClaimTransaction adapter (viem encodeFunctionData
                // + TradeExecutor pipeline); estimate callbacks use the
                // extension's estimateOffChainRewards client (spcoin_rread via
                // /api/spCoin/run-script, already CORS-trusted cross-origin).
                 // 2026-10-04 — the REWARDS/PENDING tab props
                 // (tradingAmountText, stakedAmountText, pendingAmountText,
                 // totalCoinsText, rewardRows, onRoleEstimate, onRoleClaim,
                 // pendingInitialLoading, pendingClaimInProgress,
                 // pendingClaimDisabled, pendingErrorText, onPendingEstimate,
                 // onPendingClaim) were removed for the same reason as the swap
                 // props above: MeritWalletProps never declared them (the rewards
                 // wiring was written against a planned-but-never-landed API), and
                 // tsc --noEmit in CI fails on unknown props. MeritWallet ignores
                 // unknown props at runtime; the real rewards wiring is the C1-C3
                 // phase. The parsed display strings, rewardRows and the
                 // estimate/claim handlers stay declared for that phase.
                 // 2026-10-03 — the Config tab. WalletConfigPanel is a fully
                 // CONTROLLED component: every option is a `value` + `onChange`
                 // pair (WalletConfigPanel.tsx:271-330), and CheckboxRow derives
                 // `interactive = typeof onSelect === 'function'` (:193) and
                 // passes readOnly={!interactive} (:205). With no handler passed,
                 // every row is inert AND `checked={undefined}` makes the input
                 // UNCONTROLLED — the DOM flips, React never hears about it, and
                 // it snaps back on the next render. That was the live "Config
                 // is not working" report; this block is the fix.
                 //
                 // passwordMode / mandatorySecurity / mandatoryApproval / syncMode
                 // persist and are selectable, but their ENFORCEMENT has no
                 // consumer in this host yet — the web app reads them from inside
                 // provider.ts / getConnectedSigner.ts, which do not run here.
                 // The extension's approval gate is always-explicit by
                 // construction (pendingSignRequestStore), so mandatoryApproval
                 // is effectively already true. Documented in
                 // docs/design/meritWalletHostExtraction.txt section 6.
                 configPasswordMode: walletConfig.getState().passwordMode,
            onConfigDeleteAccount: removeActiveAccount,
            walletSession,
                onConfigPasswordModeChange: (mode) => walletConfig.set({ passwordMode: mode }),
                configPasswordDescription: passwordDescriptionFor(walletConfig.getState().passwordMode),
                configMandatorySecurity: walletConfig.getState().mandatorySecurity,
                onConfigMandatorySecurityChange: (value) => walletConfig.set({ mandatorySecurity: value }),
                configMandatoryApproval: walletConfig.getState().mandatoryApproval,
                onConfigMandatoryApprovalChange: (value) => walletConfig.set({ mandatoryApproval: value }),
                configSyncMode: walletConfig.getState().syncMode,
                onConfigSyncModeChange: (mode) => walletConfig.set({ syncMode: mode }),
                configSyncDescription: syncDescriptionFor(walletConfig.getState().syncMode),
                configLocation: walletConfig.getState().location,
                onConfigLocationChange: (loc) => walletConfig.set({ location: loc }),
                configShowBackgroundPage: walletConfig.getState().showBackgroundPage,
                onConfigShowBackgroundPageChange: (value) => walletConfig.set({ showBackgroundPage: value }),
                configModalMode: walletConfig.getState().modalMode,
                onConfigModalModeChange: (value) => walletConfig.set({ modalMode: value }),
                configExtensionChannel: walletConfig.getState().extensionChannel,
                onConfigExtensionChannelChange: (channel) => walletConfig.set({ extensionChannel: channel }),
                configExtensionDownloadPath: extensionDownloadPathFor(walletConfig.getState().extensionChannel),
                // The two exchange-engine toggles. Real panelStore reads, not
                // stored values — same reason the web app's own
                // useMeritWalletConfig derives these from usePanelVisible rather
                // than its persisted config blob.
                configUniSelectVisible: engineVisibility.uniSelectVisible,
                onConfigUniswapEngineChange: (checked) => handleEngineToggle('uniswap', checked),
                configZeroXEngineVisible: engineVisibility.zeroXEngineVisible,
                onConfig0xEngineChange: (checked) => handleEngineToggle('zeroX', checked),
              },
            },
          }),
      ),
      ),
    );
  }

  // 2026-10-03 — Config tab change handlers. The chrome.storage.local half is walletConfig above (2026-10-08). handleEngineToggle
  // is the panelStore half and deliberately does NOT await: the actual write
  // happens inside MeritWalletConfigBridge, which owns the setPanelVisible
  // hook, and it calls back into render() once panelStore is updated. It
  // no-ops safely if the bridge has not mounted yet.
  function handleEngineToggle(engine: 'uniswap' | 'zeroX', checked: boolean) {
    const setters = getEngineSetters();
    if (!setters) {
      console.warn(`Merit Wallet config bridge not mounted yet; ignoring ${engine} toggle.`);
      return;
    }
    if (engine === 'uniswap') setters.setUniswapEngine(checked);
    else setters.setZeroXEngine(checked);
  }

  // 2026-09-16, on request ("when the avatar.png is selected we should get
  // ACCOUNT_PANEL with the address sent as a parameter to open the
  // avatar.png and the info.json to populate the tables") — mirrors
  // buildTokenRows' own two-step shape: resolve the icon via getTokenLogoURL
  // independent of whether the metadata record exists (getAccountAvatarURL
  // here, same "the disk path is always computable" reasoning), and the
  // info.json-equivalent (fetchAccountMetadata — the real
  // /assets/accounts/{address}/account.json file) separately, since a
  // missing metadata record shouldn't hide an avatar that genuinely exists,
  // or vice versa. Sets accountDetail to `null` fields (not undefined) on a
  // real fetch failure, matching AccountDetailPanel's own "—" placeholder
  // for whichever field genuinely has nothing to show.
  async function handleAccountIconClick(address: string) {
    accountDetail = null;
    render();
    const [avatarSrc, metadata] = await Promise.all([
      getCachedAccountIconDataUrl(getAccountAvatarURL(address), baseUrl),
      fetchAccountMetadata(address, { baseUrl }).catch(() => null),
    ]);
    accountDetail = {
      address,
      avatarSrc,
      name: metadata?.name,
      symbol: metadata?.symbol,
      email: metadata?.email,
      website: metadata?.website,
      description: metadata?.description,
      recipientNetwork: metadata?.recipientNetwork,
    };
    render();
  }

  // 2026-09-16, on live report ("assetSelectDropDown is supposed to...
  // return the address back to the caller... works in the web page, but
  // not in the extension") — MeritWallet's own row-select callbacks
  // (added this same session, see its own doc comment) fire on pick but
  // don't know what "become active" means for THIS consumer's data — that's
  // this caller's job, same as every other real-data injection point in
  // this file. Flips isActive on the picked row, clears it on every other
  // row (both across groups for accounts), then re-renders so the header
  // pill and the "ACTIVE" badge both reflect the pick immediately — no
  // fresh fetch needed, this is a pure local selection, not new data.
  // Phase B.2 Stage 2.c — accountId is the account's address (spcoin-feeds'
  // own accountsFeed.ts builds `id: entry.address`, confirmed by reading
  // it, not assumed). A locked account with no currently-valid unlock
  // token prompts for its password (render() swaps to PasswordPanel);
  // everything else (unencrypted entries, or an account this session
  // already unlocked) activates the wallet source immediately, no prompt.
  // Make an account the active one: a vault account is the vault's choice; an account MetaMask shared is kept as the external active account (the vault's own choice stays as it was).
  async function setActiveAccountOf(address: string) {
    const inVault = !!vaultRows?.some((row) => row.address.toLowerCase() === address.toLowerCase());
    if (inVault) {
      await vaultAccountsApi.setActive(address);
      vaultActive = address;
      setExternalActive(undefined);
    } else {
      setExternalActive(address);
    }
    activateAccount(address);
  }
  // The Add menu's Connect MetaMask row (docs/connectionDesign.txt item 9) and its hardware wallets (item 12): the wallet is asked (MetaMask through the relay tab, a Ledger over USB); its account becomes the active one, with that wallet recorded as the one that signs for it.
  // Several accounts offered: they are all kept and listed under that wallet, and the first becomes active.
  async function connectExternalFromMenu(approverId: AuthenticatorId) {
    const host = {
      setActiveAccount: (address: string) => setActiveAccountOf(address),
      setActiveAuthenticator: (address: string, id: AuthenticatorId) => extensionWallet.setActiveAuthenticator(address, id),
      clearActiveAccount: () => undefined,
    };
    try {
      await connectAccount({ registry: extensionAuthenticatorRegistry, approverId, host });
    } catch (error) {
      if (!(error instanceof ConnectChoiceRequired)) throw error;
      await connectAccount({ registry: extensionAuthenticatorRegistry, approverId, address: error.accounts[0].address, host });
    }
    vaultRowsStale = true;
    await loadVaultAccounts();
  }
  function handleAccountRowSelect(accountId: string) {
    if (vaultRows) {
      // A vault account: the vault keeps the active choice; no hosted-app unlock exists or is needed.
      void vaultAccountsApi.setActive(accountId).then(() => {
        vaultActive = accountId;
        activateAccount(accountId);
      });
      return;
    }
    activateAccount(accountId);
  }

  // Sets the picked account as the real ExchangeContextWalletSource's active address. The header and the list's ACTIVE badge follow it
  // through MeritWallet's activeAccountAddress prop (no per-row isActive flags are kept here any more).
  function activateAccount(accountId: string) {
    walletSource = { ...walletSource, address: accountId, isConnected: true };
    render();
  }


  // Phase B.2 Stage 4 follow-up ("build actual trading functionality...
  // do it") — the first real trade-execution flow in the extension.
  // Native-currency only (see sendNative.ts's own header comment for why
  // an ERC20 tokenAddress is rejected rather than guessed at). Approval
  // gating (TransactionConfirmPanel) happens inside the authenticator's sendTransaction
  // itself — this function's own job is just resolving the real params
  // (active address, cached unlock token if this account is locked, the
  // real Hardhat rpcUrl) and reporting the outcome.
  async function handleSendSubmit(params: {
    recipientAddress?: string;
    tokenAddress?: string;
    amount: string;
    decimals?: number;
    tokenSymbol?: string;
  }): Promise<HostTransactionResult> {
    const from = walletSource.address;
    if (!from) return { ok: false, message: 'Select and activate an account first.' };

    sendBusy = true;
    render();

    // Table row 13: an account that belongs to the unlocked vault signs locally in the worker; any other account still goes through the hosted app.
    const vaultList = (await chrome.runtime.sendMessage({ type: 'merit/accounts/list' }).catch(() => undefined)) as
      | { ok?: boolean; accounts?: Array<{ address: string }> }
      | undefined;
    const useVault = (!!vaultList?.ok && !!vaultList.accounts?.some((a) => a.address.toLowerCase() === from.trim().toLowerCase())) || (await isExternalAccount(from));
    const network = listConfiguredNetworks({ showTestNets: true }).find((row) => row.chainId === activeChainId);
    const result = await sendNativeMerit({
      useVault,
      chainId: activeChainId,
      rpcUrl: chainRpcUrl(),
      from,
      recipientAddress: params.recipientAddress,
       tokenAddress: params.tokenAddress,
       amount: params.amount,
       decimals: params.decimals,
       tokenSymbol: params.tokenSymbol,
       nativeSymbol: network?.symbol ?? 'ETH',
    });

    sendBusy = false;
    if (result.ok) sendAmount = '';
    render();
    // The wallet shows the result card (MESSAGE_PANEL) from what is returned, the same one the web app shows after a send.
    if (result.ok) void walletRefresh.run();
    return result.ok ? sendOutcomeToHostResult({ hash: result.hash, receipt: result.receipt as never }) : { ok: false, message: result.message };
  }

   // (The Rewards tab's estimate and claim run through rewardsHost above; the older per-button handlers that stood here were never wired and are gone.)

   function handleNetworkRowSelect(networkId: string) {
    const next = Number(networkId);
    if (!Number.isFinite(next) || next === activeChainId) return;
    setActiveChain(next);
    void chrome.runtime.sendMessage({ type: 'merit/network/set', chainId: next }).catch(() => undefined);
    render();
  }

  // 2026-09-16, on request ("while waiting we should always show the
  // required page first") — render the wallet shell immediately with
  // whatever's on hand (uiState's own persisted menu selection, the real
  // engine's own persisted tab — see this file's own Path-A comment
  // above — MeritWallet's own SAMPLE_*/empty fallbacks for the not-yet-loaded
  // account/network/token rows) instead of leaving `wallet-root` blank
  // for however long the three real fetches below take. Real data then
  // replaces it in place once it resolves — same two-render pattern
  // the refresh does too, just applied to the very first load.
  render();

  // tokenRows/recipientRows no longer fetched here either — MeritWallet's
  // own self-fetch (chainId/baseUrl props, wired into the render call above)
  // handles their first fetch itself once chainId is set.
  render();
}

void renderWallet();
