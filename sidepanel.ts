import React from 'react';
import { createRoot } from 'react-dom/client';
import './src/tailwind.css';
import { bundledFeedData } from './src/bundledFeeds';
import { extensionAuthenticatorRegistry } from './src/localVaultAuthenticator';
import { startDappApprovals } from './src/dappApprovals';
import { createSwapHost } from './src/swapHost';
import { vaultAccountsApi, vaultOnboarding, vaultStatus, vaultTestAccountsApi } from './src/vaultScreens';
import { estimateRewardsByMethod, throttleRead, AuthenticationType, TestAccountsSection, MeritWalletHostView, ChangePasswordPanel, DeleteWalletDialog, VaultAccountsPanel, WalletOnboardingPanel, createWalletRefresh, createWalletConfig, createWalletSession, WalletSecuritySection, type AccountProfileHost, type HostTransactionResult, type RewardsHost, type SponsorStakingHost, type WalletSecurityApi } from '@sponsorcoin/merit-wallet';
import { PasswordPanel, type AssetListEntry, type ManageSponsorshipRole, type ManageSponsorshipRoleRow } from '@sponsorcoin/spcoin-panels';
import { APP_TYPE } from '@sponsorcoin/spcoin-common';
import {
  readRecordValue,
  formatAccountRecordAmount,
  REWARD_ROLES,
  REWARD_ROLE_CONFIG,
  TOTAL_REWARD_CONFIG,
  getPendingRewardsTotalFromRecord,
  getAccountRecordPendingReward,
} from '@sponsorcoin/spcoin-panels';
import {
  ExchangeProviderCore,
  DisplayStackProvider,
  buildDefaultExchangeContext,
  deriveStandardBootPanelState,
  clone as cloneContext,
  type ExchangeProviderHost,
  PanelBootstrap,
  loadSpCoinDeploymentMap,
  getPreferredSpCoinContractAddress,
  type ExchangeContextWalletSource,
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
import { fetchTokenByAddress, getTokenLogoURL } from '@sponsorcoin/spcoin-feeds/tokens';
import { openOrFocusApp } from './src/openApp';
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
import { getCachedTokenIconDataUrl } from './src/tokenIconCache';
import { chromeIconCacheStorage } from './src/chromeIconCacheStorage';
import { ActiveAccountHydrator } from './src/hydrateActiveAccount';
import { hydrateAccountFromAddress } from './src/hydrateAccountFromAddress';
import { TransactionConfirmOrchestrator } from './src/TransactionConfirmOrchestrator';
import { sendNativeMerit } from './src/sendNative';
import { allowLegacySigning, signMessageWithVault } from './src/localSigning';
import { encodeFunctionData } from 'viem';
import { runSpCoinReadStep } from './src/runSpCoinReadStep';
import { buildMeritTradeExecutorContext } from './src/tradeExecutorMerit';
import { makeFetchBalance } from './src/fetchBalance';
import { rpcUrlForChain } from './src/chainRpc';
import { makeResolveAssetAddress } from './src/resolveAssetAddress';
import { getAccountRecord } from './src/getAccountRecord';
import { estimateOffChainRewards } from './src/estimateOffChainRewards';
import { executeStakeTransaction, SPOIN_STAKE_ABI } from './src/executeStakeTransaction';
import { executeClaimTransaction, SPOIN_CLAIM_ABI } from './src/executeClaimTransaction';
import { executeUniswapV3Swap } from './src/executeUniswapV3Swap';
import { parseAbi } from 'viem';

// 2026-09-22, Phase B.2 Stage 4 follow-up — the real Hardhat/HH_BASE RPC
// URL, same value the web app itself uses for this exact chain id
// (public/assets/blockchains/31337/defaultNetworkSettings.json's own
// networkHeader.rpcUrl) — a stable public HTTPS proxy, not a
// localhost-only address, so it resolves from this extension too. Checked
// directly rather than assumed: LiteExchangeProvider's default boot
// context has rpcUrl: '' (Stage 13.a's own deliberate "not needed yet"
// scope cut) — this constant is what closes that gap for the one real
// caller (handleSendSubmit below) that now needs it. Already public — this
// exact string is served today from that same static JSON file, not a
// secret newly exposed here.
const MERIT_WALLET_HARDHAT_RPC_URL = 'https://rpc.sponsorcoin.org/f5b4d4b4a2614a540189b979d068639c3fd44bbb1dfcdb5a';

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
// 2026-10-09 (docs/authenticationDesign.txt row 6): the extension's authenticator registry (localVault). Read-only handle for diagnostics and the live checks (scripts/extensionRequests.cjs).
(globalThis as unknown as { __spcoinAuthenticators?: typeof extensionAuthenticatorRegistry }).__spcoinAuthenticators = extensionAuthenticatorRegistry;


// 2026-10-05 — resolves an address typed into a list's ADDRESS_PANEL that isn't one of the loaded rows
// (see src/resolveAssetAddress.ts). Module scope for a stable identity; the app origin follows the
// open-target setting, so it reads currentBaseUrl, which every render refreshes.
let currentBaseUrl = '';
const resolveAssetAddress = makeResolveAssetAddress({
  rpcUrl: MERIT_WALLET_HARDHAT_RPC_URL,
  chainId: MERIT_WALLET_HARDHAT_CHAIN_ID,
  getBaseUrl: () => currentBaseUrl,
});

// spCoin contract address for the Hardhat chain — the same V0 fallback the
// web app uses (components/views/TradingStationPanel/StakingStatusPanel.tsx's
// FALLBACK_SPONSOR_COIN_ADDRESS), since the extension has no ExchangeContext
// activeTokens.activeSpCoinAddress to read from yet (Phase B.2 Stage 2 — see
// exchangeContextTypes.ts). This is the deployed spCoin V0 on Hardhat 31337.
const SPOIN_HARDHAT_CONTRACT_ADDRESS = '0x0E9166c03194E40eE84532e9A659abcE40ab1724';

// 2026-10-07 — the REAL active spCoin address, read from the web app's saved ExchangeContext
// (GET /api/exchangeContext?key=<account> -> apiCoreSyncedMembers.activeTokens.activeSpCoinAddress). The V0
// constant above has no contract on the fork (eth_getCode is empty), so every spCoin read and the SPONSOR tab's
// "Sponsor Staked spCoins" balance came back empty/0. The constant stays only as a last-resort fallback.
// 2026-10-09 (docs/nodeSourceMigrationPlan.txt row 25): the default no longer needs the web app. The spCoin deployment map is bundled (src/bundledFeedData.json), the engine's registry answers
// "which spCoin is deployed on this chain" from it, and the newest deployment is the starting point; the synced value from the web app (below) only REFINES it when the hosted app answers.
loadSpCoinDeploymentMap(bundledFeedData['/resources/data/networks/spCoinDeployment.json']);
let activeSpCoinAddress: string | undefined = getPreferredSpCoinContractAddress(MERIT_WALLET_HARDHAT_CHAIN_ID);
let activeSpCoinLoadedFor = '';
const spCoinAddress = (): string => activeSpCoinAddress ?? SPOIN_HARDHAT_CONTRACT_ADDRESS;

async function loadActiveSpCoinAddress(baseUrl: string, account: string): Promise<string | undefined> {
  try {
    const response = await fetch(`${baseUrl}/api/exchangeContext?key=${encodeURIComponent(account.toLowerCase())}`);
    if (!response.ok) return undefined;
    const body = await response.json();
    const address = body?.apiCoreSyncedMembers?.activeTokens?.activeSpCoinAddress?.address;
    return typeof address === 'string' && /^0x[0-9a-fA-F]{40}$/.test(address) ? address : undefined;
  } catch {
    return undefined;
  }
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

// 2026-09-18, Phase B.2 Stage 2.c — spcoin-feeds' own KeystoreAccountEntry
// (accountsFeed.ts) deliberately mirrors toClientSafeKeyStoreEntries'
// client-safe shape MINUS isLocked/encryptedKey — those are keystore
// internals, not part of that package's own "public account list" concern.
// Fetched separately here, directly against the same testAccounts route
// (CORS-enabled for GET only, Stage 2.a), to know which accounts need a
// password before `unlockMeritWalletAccount` below is worth prompting for.
interface RawTestAccountEntry {
  address?: unknown;
  isLocked?: unknown;
  hasPrivateKey?: unknown;
}

async function fetchKeystoreLockStatus(baseUrl: string): Promise<Map<string, boolean>> {
  const lockStatus = new Map<string, boolean>();
  try {
    const response = await fetch(`${baseUrl}/api/spCoin/lab/networks/${MERIT_WALLET_HARDHAT_CHAIN_ID}/testAccounts`);
    if (!response.ok) return lockStatus;
    const entries = (await response.json()) as RawTestAccountEntry[];
    if (!Array.isArray(entries)) return lockStatus;
    for (const entry of entries) {
      const address = typeof entry?.address === 'string' ? entry.address.trim().toLowerCase() : '';
      if (!address) continue;
      lockStatus.set(address, Boolean(entry?.isLocked));
    }
  } catch (error) {
    // A locked-status lookup failing just means every account is treated
    // as "not locked" (handleAccountRowSelect's own `?? false` below) —
    // the unlock prompt simply won't show; not a hard failure for the
    // rest of the wallet UI.
    console.error('Failed to load Merit Wallet keystore lock status:', error);
  }
  return lockStatus;
}

// 2026-09-18, Phase B.2 Stage 2.c — POSTs to the same unlock route the web
// app's own PasswordGateOrchestrator flow uses (app/api/spCoin/meritConnect/
// unlock/route.ts), now cross-origin-trusted for this extension's pinned
// origin (Stage 2.b's meritConnectExtensionAuth.ts). Returns only an
// opaque, short-lived capability token — the private key itself never
// reaches this file, same guarantee the web app's own flow has.
async function unlockMeritWalletAccount(
  baseUrl: string,
  address: string,
  password: string,
): Promise<{ ok: true; token: string } | { ok: false; message: string }> {
  try {
    const response = await fetch(`${baseUrl}/api/spCoin/meritConnect/unlock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chainId: MERIT_WALLET_HARDHAT_CHAIN_ID, address, password }),
    });
    const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; token?: string; message?: string };
    if (!response.ok || !payload.ok || !payload.token) {
      return { ok: false, message: payload.message || 'Unlock failed.' };
    }
    return { ok: true, token: payload.token };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}

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
  const baseUrl = urlForOpenTarget(openTarget);
  currentBaseUrl = baseUrl;
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

  const walletRefresh = createWalletRefresh(
    {
      reload: async () => {
        // The lock status belongs to the hosted app's keystore accounts, which only exist when the vault is not required (2026-10-09, row 25: no request to the web app in the default vault mode).
        lockStatusByAddress = requireVault ? new Map() : await fetchKeystoreLockStatus(baseUrl);
      },
    },
    () => render(),
  );
  // The active network (chain id), the same role appChainId plays in the web app. MeritWallet self-fetches the network rows and marks
  // this one active; selecting a network row changes it (handleNetworkRowSelect).
  let activeChainId: number = MERIT_WALLET_HARDHAT_CHAIN_ID;
  // 2026-10-08 (table row 18): the worker owns the active network so web pages and the side panel agree on it (MetaMask: one selected network).
  void (chrome.runtime.sendMessage({ type: 'merit/network/get' }) as Promise<{ ok?: boolean; chainId?: number }>).then((reply) => {
    if (reply?.ok && typeof reply.chainId === 'number' && reply.chainId !== activeChainId) {
      activeChainId = reply.chainId;
      render();
    }
  }).catch(() => undefined);
  chrome.runtime.onMessage.addListener((message: { type?: string; chainId?: number }) => {
    if (message?.type === 'merit/network/changed' && typeof message.chainId === 'number' && message.chainId !== activeChainId) {
      activeChainId = message.chainId;
      render();
    }
    return false;
  });
  startDappApprovals();
  // The wallet's own account screens (VaultAccountsPanel / WalletOnboardingPanel): opened from the account list's Add button.
  // The Swap tab's trade button (table row 22): price from Uniswap on-chain or the hosted 0x quote service, swap through the same executor as stake.
  // Editing the public profile of the wallet's own accounts (Account Details > Edit Profile): the hosted app's nonce / verify / save sequence, the account signing its challenge
  // with the vault behind the confirmation screen (a test account signs without it). After a save the details, header and list read the new values at once.
  const accountProfileHost: AccountProfileHost = {
    baseUrl,
    canEdit: (address) => !!vaultRows?.some((row) => row.address.toLowerCase() === address.toLowerCase()),
    signMessage: (address, message) =>
      signMessageWithVault(address, message, {
        title: 'Save account profile',
        message: 'Sign in to the hosted app to save this account profile. This does not send a transaction.',
        signerAddress: address,
        chainId: activeChainId,
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
  // Sponsor staking (the Rewards tab's Unstake list and the Sponsor tab's "Sponsor Staked spCoins" line): contract views are read straight from the chain's RPC, an Un-Stake
  // leg is encoded here and signed by the vault behind the confirmation screen, one transaction per leg, each waited for. One stable object so the wallet does not refetch every render.
  const sponsorReadParams = () => ({ contractAddress: spCoinAddress(), rpcUrl: MERIT_WALLET_HARDHAT_RPC_URL, accessSource: 'local' as const, readMode: 'hardhat' as const });
  const stakingHost: SponsorStakingHost = {
    contractAddress: () => spCoinAddress(),
    read: (method, args) => runSpCoinReadStep(sponsorReadParams(), method, args, baseUrl),
    send: async (method, args) => {
      const from = walletSource.address;
      if (!from) throw new Error('Select and activate an account first.');
      const data = encodeFunctionData({ abi: SPOIN_STAKE_ABI, functionName: method, args: args as never });
      const context = buildMeritTradeExecutorContext({ baseUrl, rpcUrl: MERIT_WALLET_HARDHAT_RPC_URL }, { address: from, isConnected: true, chainId: MERIT_WALLET_HARDHAT_CHAIN_ID });
      const result = await context.executor.execute({
        to: spCoinAddress(),
        data,
        chainId: MERIT_WALLET_HARDHAT_CHAIN_ID,
        rpcUrl: MERIT_WALLET_HARDHAT_RPC_URL,
        display: { title: 'Un-Stake', label: method, contractAddress: spCoinAddress() } as never,
      });
      const receipt = result.receipt;
      return { hash: result.transactionHash, gasUsed: receipt ? BigInt(receipt.gasUsed) : undefined, gasPrice: receipt?.gasPrice != null ? BigInt(receipt.gasPrice) : undefined };
    },
    loadProfile: async (address) => (await hydrateAccountFromAddress(address, { baseUrl })) ?? { address },
    spCoinContract: { address: spCoinAddress() as `0x${string}`, chainId: MERIT_WALLET_HARDHAT_CHAIN_ID, name: 'Sponsor Coin', symbol: 'SPCOIN', decimals: 18, balance: 0n } as never,
    onChanged: () => void walletRefresh.run(),
  };
  // The Rewards tab (the same card and data hook as the web app's): reads go to the hosted app's run-script route, a CLAIM is signed by the vault behind the confirmation screen.
  // 2026-10-09 (row 25): one throttled direct read of the active spCoin contract's views, shared by the reward estimate and the account record (no hosted app needed for either).
  const chainRead = throttleRead((m, a) => runSpCoinReadStep({ contractAddress: spCoinAddress(), rpcUrl: MERIT_WALLET_HARDHAT_RPC_URL, accessSource: 'local', readMode: 'hardhat' }, m, a, baseUrl));
  const rewardsHost: RewardsHost = {
    contractAddress: () => spCoinAddress(),
    rpcUrl: MERIT_WALLET_HARDHAT_RPC_URL,
    accessSource: 'local',
    readMode: 'hardhat',
    endpoint: `${baseUrl}/api/spCoin/run-script`,
    // Trading and Staked come straight from the contract's getAccountRecord view.
    // 2026-10-09 (docs/nodeSourceMigrationPlan.txt row 25): the reward ESTIMATES are computed here too, from direct reads of the contract's views (estimateRewards.ts, a port of the access module's calculation,
    // checked against the run-script result for 18 live accounts), so the Rewards tab needs no hosted app.
    estimate: (method, accountKey) =>
      estimateRewardsByMethod(method, { accountKey, read: chainRead }),
    readAccountRecord: (accountKey) => runSpCoinReadStep({ contractAddress: spCoinAddress(), rpcUrl: MERIT_WALLET_HARDHAT_RPC_URL, accessSource: 'local', readMode: 'hardhat' }, 'getAccountRecord', [{ key: 'Account Key', value: accountKey }], baseUrl),
    claim: async (method, accountKey) => {
      const result = await executeClaimTransaction({
        baseUrl,
        rpcUrl: MERIT_WALLET_HARDHAT_RPC_URL,
        accountKey,
        method: method as Parameters<typeof executeClaimTransaction>[0]['method'],
        abi: SPOIN_CLAIM_ABI,
        contractAddress: spCoinAddress(),
        chainId: MERIT_WALLET_HARDHAT_CHAIN_ID,
        fromAddress: accountKey,
      });
      return { transactionHash: result.transactionHash };
    },
    onClaimed: () => void walletRefresh.run(),
  };
  // Config > Wallet Security: reveal the active account's private key or the Secret Recovery Phrase, each behind the wallet password (MetaMask's Security & privacy).
  const revealReply = async (message: unknown) => {
    const reply = (await chrome.runtime.sendMessage(message)) as { ok: boolean; error?: string; message?: string; privateKey?: string; mnemonic?: string };
    if (!reply.ok) throw new Error(reply.error === 'wrong-password' ? 'Incorrect password.' : reply.error === 'too-many-attempts' ? 'Too many incorrect passwords. Wait a moment and try again.' : reply.message || 'The wallet could not do that. If you just updated the extension, reload it at chrome://extensions.');
    return reply;
  };
  const walletSecurityApi: WalletSecurityApi = {
    revealPrivateKey: async (password, address) => String((await revealReply({ type: 'merit/accounts/exportPrivateKey', password, address })).privateKey ?? ''),
    revealPhrase: async (password) => String((await revealReply({ type: 'merit/accounts/revealMnemonic', password })).mnemonic ?? ''),
  };
  const swapHost = createSwapHost({
    baseUrl,
    getAccount: () => walletSource.address,
    // After a swap: reload balances through the same refresh the header icon runs.
    onSettled: () => void walletRefresh.run(),
    onResult: (result) => {
      alert(result.ok ? `Swap sent.${result.hash ? ` Transaction hash: ${result.hash}` : ''}` : `Swap failed: ${result.message}`);
    },
  });
  // Setup is required (the wallet is unusable until a vault exists, MetaMask's onboarding) only when this storage flag is set; until the hosted-app
  // accounts are retired it stays off, so an extension without a vault keeps working as before.
  let requireVault = true;
  let onboardingOpen = false;
  void chrome.storage.local.get('spcoin_merit_require_vault').then((stored) => {
    // 2026-10-08: the vault is the wallet by default (MetaMask). Only an explicit false keeps the old hosted-account path.
    requireVault = stored.spcoin_merit_require_vault !== false;
    allowLegacySigning(!requireVault);
    render();
  });

  // The accounts of the unlocked vault feed the account list and the active account (the hosted-app accounts are only used when requireVault is false).
  let vaultRows: Array<{ address: string; name: string }> | null = null;
  let vaultActive: string | undefined;
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
    if (vaultActive && walletSource.address?.toLowerCase() !== vaultActive.toLowerCase()) activateAccount(vaultActive);
    else render();
  }
  let vaultScreen: 'accounts' | 'onboarding' | 'password' | null = null;
  function closeVaultScreen() {
    vaultScreen = null;
    vaultRowsStale = true;
    render();
  }
  // Delete the wallet from this device (after a confirmation); the account list falls back to setup. Used by the lock screen's reset link and Config's Delete Account.
  function resetWallet() {
    if (!window.confirm('Reset this wallet? This deletes the wallet from this device. You can only get your accounts back with your Secret Recovery Phrase.')) return;
    void chrome.runtime.sendMessage({ type: 'merit/vault/wipe' }).then(() => {
      vaultRows = null;
      vaultRowsStale = true;
      vaultScreen = null;
      return vaultSession.refresh();
    });
  }
  // Config's Remove Account: remove the active account from the wallet. Only accounts imported by private key can go (the others come from the Secret Recovery Phrase).
  let deleteWalletDialogOpen = false;
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
  function openChangePassword() {
    vaultScreen = 'password';
    render();
  }
  function openVaultScreen() {
    void vaultStatus().then((status) => {
      vaultScreen = status.initialized ? 'accounts' : 'onboarding';
      render();
    });
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
    },
    () => render(),
  );
  let engineVisibility: EngineVisibility = readEngineVisibility();
  // Phase B.2 Stage 2.c — real wallet-source state, same "plain outer-scope
  // variable, mutated then render() called" shape as every other piece of
  // state in this file (walletSource, activeChainId, etc.), not React state.
  let walletSource: ExchangeContextWalletSource = DISCONNECTED_WALLET_SOURCE;
  let lockStatusByAddress = new Map<string, boolean>();
  // The single currently-unlocked account's capability token (one at a
  // time, matching walletSource's own single-active-address model — Merit
  // Wallet Stage 2.c doesn't support switching between two simultaneously
  // unlocked accounts, same "unlock once, one active session" shape as
  // walletSource.address itself). Not currently consumed anywhere yet
  // (Stage 3/4's job — sign/hydration) but kept here, address-scoped, so
  // this stage's own re-select doesn't immediately re-prompt for a
  // password it just successfully entered.
  let unlockToken: string | null = null;
  let unlockTokenAddress: string | null = null;
  let unlockPrompt: { address: string } | null = null;
  let unlockError: string | undefined;
  let unlocking = false;
  // Phase B.2 Stage 4 follow-up — the SEND tab's real, controlled amount
  // field (MeritWallet.tsx's own sendAmount/onSendAmountChange props, this
  // session) and busy flag while a real send is in flight.
  let sendAmount = '';
   let sendBusy = false;
   // 2026-09-26, Phase 4 — SPONSOR tab stake execution busy flag + amount state.
    let sponsorStakeBusy = false;
    let sponsorStakeAmount = '';
    let sponsorSwapBusy = false;
    // 2026-09-28, TRADING_STATION_PANEL migration — SWAP tab amount + busy state.
    let swapAmount = '';
    let swapBusy = false;
    /** 2026-09-27, Phase 4 — swap execution callback for SPONSOR tab.
     *  Called by MeritWallet when the user clicks "Swap to spCoin" before
     *  staking. Uses the extension's executeUniswapV3Swap adapter which
     *  delegates to the portable @sponsorcoin/spcoin-onchain module via
     *  the extension's TradeExecutor (tradeExecutorMerit.ts). */
    async function handleSponsorSwapSubmit(params: {
      tokenIn: string;
      tokenOut: string;
      amountIn: bigint;
      recipient: string;
      chainId: number;
    }) {
      const from = walletSource.address;
      if (!from) {
        alert('Select and activate an account first.');
        return;
      }

      sponsorSwapBusy = true;
      render();

      try {
        const result = await executeUniswapV3Swap({
          baseUrl,
          rpcUrl: MERIT_WALLET_HARDHAT_RPC_URL,
          chainId: params.chainId,
          tokenIn: params.tokenIn,
          tokenOut: params.tokenOut,
          amountIn: params.amountIn,
          amountOutMinimum: 0n,
          recipient: params.recipient,
          fee: 3000,
          fromAddress: from,
        });

        if (result.transactionHash) {
          alert(`Swap submitted. Transaction hash: ${result.transactionHash}`);
        } else {
          alert('Swap completed with no transaction hash.');
        }
      } catch (error) {
        alert(`Swap failed: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        sponsorSwapBusy = false;
        render();
      }
    }

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
  // Same idea, for the token-list's own info icon (Select a Token) — see
  // MeritWallet's own tokenDetail prop doc comment.
  let tokenDetail:
    | {
        address: string;
        logoSrc?: string;
        name?: string;
        symbol?: string;
        decimals?: number;
        website?: string;
        explorer?: string;
        description?: string;
      }
     | null = null;

  // Phase B.2 — on-chain AccountStruct fetched via getAccountRecord through
  // /api/spCoin/run-script. Populated when an account is activated (either
  // directly for an unlocked account, or after the password unlock resolves
  // for a locked one). Passed to MeritWallet as `accountRecord` so panels
  // like ManageSponsorshipsPanel can render real on-chain data without
  // needing their own run-script client wired up — this file's plain fetch()
  // pattern with an absolute baseUrl resolves correctly from a
  // chrome-extension:// origin, and the server's read-only CORS grant
  // (exchangeContextCors.ts, MERIT_EXTENSION_ORIGIN) is already wired into
  // run-script/route.ts's POST handler.
  let   accountRecord: unknown = null;

  // Phase B.2 — estimateOffChainTotalRewards result for the active account,
  // fetched alongside getAccountRecord so panels like ManageSponsorshipsPanel
  // have everything they need on account selection.
   let rewardEstimate: unknown = null;

   // 2026-09-27, Phase C — parsed reward display state for ManageSponsorshipsPanel.
   // Derived from accountRecord + rewardEstimate in parseRewardDisplay().
   let rewardTradingText = '';
   let rewardStakedText = '';
   let rewardPendingText = '';
   let rewardTotalCoinsText = '';
   let rewardRows: ManageSponsorshipRoleRow[] = [];
   let rewardRoleLoading: Record<string, boolean> = {};
   let rewardClaimBusy = false;
   let rewardEstimateBusy = false;
   let rewardError: string | undefined;

  function render() {
    if (requireVault && vaultSession.getState().phase === 'setup') onboardingOpen = true;
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
      void loadActiveSpCoinAddress(baseUrl, walletSource.address).then((address) => {
        if (address && address !== activeSpCoinAddress) {
          activeSpCoinAddress = address;
          render();
        }
      });
    }
    root.render(
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
        React.createElement(ActiveAccountHydrator, { baseUrl }),
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
        deleteWalletDialogOpen
          ? React.createElement(DeleteWalletDialog, {
              confirmDelete: async (password: string) => {
                let verified = (await chrome.runtime.sendMessage({ type: 'merit/vault/verifyPassword', password })) as { ok: boolean; error?: string; message?: string };
                // A background service that has not been reloaded yet does not know verifyPassword; checking through the (password-protected) phrase reveal gives the same answer.
                if (!verified.ok && verified.error === 'invalid-request') {
                  verified = (await chrome.runtime.sendMessage({ type: 'merit/accounts/revealMnemonic', password })) as { ok: boolean; error?: string; message?: string };
                }
                if (!verified.ok) throw new Error(verified.error === 'wrong-password' ? 'Incorrect password.' : verified.error === 'too-many-attempts' ? 'Too many incorrect passwords. Wait a moment and try again.' : verified.message || (verified.error === 'invalid-request' ? 'The wallet service is out of date. Reload the extension at chrome://extensions and try again.' : 'The password could not be checked (' + (verified.error ?? 'no answer') + ').'));
                await chrome.runtime.sendMessage({ type: 'merit/vault/wipe' });
                deleteWalletDialogOpen = false;
                vaultRows = null;
                vaultRowsStale = true;
                vaultScreen = null;
                walletSource = DISCONNECTED_WALLET_SOURCE;
                await vaultSession.refresh();
                render();
              },
              onClose: () => {
                deleteWalletDialogOpen = false;
                render();
              },
            })
          : null,
        // Phase B.2 Stage 2.c — PasswordPanel replaces MeritWallet
        // entirely while a locked account's password is being requested,
        // same shape as the web app's own PasswordGateOrchestrator
        // (whole-wallet gate, not a modal-over-content overlay) — simpler
        // to reason about for this first real wallet-source wiring than a
        // layered overlay would be.
        // 2026-10-08 (table rows 21 and 23): the wallet's own account screens, shown instead of the wallet body while open.
        vaultScreen && vaultSession.getState().phase !== 'locked'
          ? React.createElement(
              'div',
              { style: { display: 'flex', flexDirection: 'column', height: '100%', color: '#fff' } },
              React.createElement(
                'button',
                { type: 'button', onClick: closeVaultScreen, style: { alignSelf: 'flex-start', margin: '8px 12px 0', background: 'none', border: 0, color: '#5981F3', cursor: 'pointer', font: 'inherit' } },
                '← Back to wallet',
              ),
              vaultScreen === 'password'
                ? React.createElement(ChangePasswordPanel, {
                    changePassword: async (oldPassword: string, newPassword: string) => {
                      const reply = (await chrome.runtime.sendMessage({ type: 'merit/vault/changePassword', oldPassword, newPassword })) as { ok: boolean; error?: string; message?: string };
                      if (!reply.ok) throw new Error(reply.error === 'wrong-password' ? 'Incorrect current password.' : reply.error === 'too-many-attempts' ? 'Too many incorrect passwords. Wait a moment and try again.' : reply.message || 'The password could not be changed.');
                    },
                    onDone: closeVaultScreen,
                  })
                : vaultScreen === 'onboarding'
                ? React.createElement(WalletOnboardingPanel, {
                    createWallet: vaultOnboarding.createWallet,
                    importWallet: vaultOnboarding.importWallet,
                    onDone: () => {
                      void vaultSession.refresh().then(closeVaultScreen);
                    },
                  })
                : React.createElement(VaultAccountsPanel, { api: vaultAccountsApi, onActiveChanged: (address: string) => activateAccount(address) }),
            )
          : requireVault && (vaultSession.getState().phase === 'setup' || onboardingOpen)
          ? React.createElement(WalletOnboardingPanel, {
              createWallet: vaultOnboarding.createWallet,
              importWallet: vaultOnboarding.importWallet,
              // The panel stays up through the recovery-phrase step even though the vault already exists by then (phase is no longer 'setup').
              onDone: () => {
                // Close only after the status says a vault exists, or render() would re-open setup from the stale phase.
                void vaultSession.refresh().then(() => {
                  onboardingOpen = false;
                  render();
                });
              },
            })
          : unlockPrompt
          ? React.createElement(PasswordPanel, {
              mode: 'unlock',
              icon: React.createElement('img', { src: brandLogoUrl, alt: '' }),
              errorText: unlockError,
              submitting: unlocking,
              onSubmit: (password: string) => void handleUnlockSubmit(password),
            })
          : React.createElement(MeritWalletHostView, {
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
                // The host's real active account; '' means none selected, so the header reads "Select Account".
                activeAccountAddress: walletSource.address ?? '',
                accountGroups: vaultRows
                  ? [
                      {
                        id: 'merit-wallet',
                        label: 'Merit Wallet',
                        isActiveSource: true,
                        accounts: vaultRows.map((a) => ({
                          id: a.address,
                          symbol: vaultMeta.get(a.address.toLowerCase())?.symbol || a.name,
                          name: vaultMeta.get(a.address.toLowerCase())?.name || a.name,
                          iconSrc: vaultMeta.get(a.address.toLowerCase())?.iconSrc,
                          address: a.address,
                          isActive: a.address.toLowerCase() === (walletSource.address ?? '').toLowerCase(),
                        })),
                      },
                    ]
                  : undefined,
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
                activeSpCoinAddress: spCoinAddress(),
                rewardsHost,
                stakingHost,
              },
              selection: {
                onAddAccount: openVaultScreen,
                swapHost,
                onAccountRowSelect: handleAccountRowSelect,
                onNetworkRowSelect: handleNetworkRowSelect,
                onAccountIconClick: (address: string) => void handleAccountIconClick(address),
                accountDetail,
                accountProfileHost,
                onTokenIconClick: (address: string) => void handleTokenIconClick(address),
                tokenDetail,
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
                // 2026-09-26, Phase 4 — SPONSOR tab stake execution wiring.
                sponsorStakeSubmitBusy: sponsorStakeBusy,
                onSponsorStakeSubmit: (params: {
                  recipientAddress?: string;
                  agentAddress?: string;
                  amount: bigint;
                  recipientRateKey: number;
                  agentRateKey: number;
                }) => handleSponsorStakeSubmit(params),
                // 2026-09-26, Phase 4 finish — real amount input for SPONSOR tab.
                sponsorAmount: sponsorStakeAmount,
                onSponsorAmountChange: (value: string) => {
                  sponsorStakeAmount = value;
                  render();
                },
                sponsorAmountBusy: sponsorStakeBusy,
              },
              slots: {
                configSecurityPanelContent: React.createElement(WalletSecuritySection, { api: walletSecurityApi }),
                configTestAccountsContent: React.createElement(TestAccountsSection, {
                  api: vaultTestAccountsApi,
                  authenticationType: AuthenticationType.VAULT,
                  onChanged: () => {
                    vaultRowsStale = true;
                    render();
                  },
                }),
              },
              lock: {
                // 2026-10-08 (table row 23): the lock gate is the component's own: while the vault is locked it shows the password screen in place of everything.
                walletLocked: vaultSession.getState().phase === 'locked',
                onResetWallet: resetWallet,
                passwordMode: 'unlock',
                passwordIcon: React.createElement('img', { src: brandLogoUrl, alt: '' }),
                passwordErrorText: vaultSession.getState().error || undefined,
                passwordSubmitting: vaultSession.getState().submitting,
                onPasswordSubmit: (password: string) => void vaultSession.submit(password, ''),
              },
              config: {
                // 2026-10-04 — the SPONSOR-swap and SWAP execution props
                // (onSponsorSwapSubmit, sponsorSwapBusy, swapAmount,
                // onSwapAmountChange, swapBusy, onSwapSubmit, activeChainId)
                // and the AGENT_HEADER_PANEL auto-seed props
                // (defaultAgentAddress, onHydrateAgent) were removed:
                // MeritWalletProps never declared them (verified absent even in
                // the pre-submodule-conversion copy — a planned-but-never-landed
                // API), and tsc --noEmit in CI fails on unknown props. MeritWallet
                // ignores unknown props at runtime, so this changes nothing
                // behaviorally; the real swap and agent-hydration wiring is the
                // C1-C3 phase. The handlers (handleSponsorSwapSubmit,
                // hydrateAccountFromAddress) and state (swapAmount, swapBusy,
                // sponsorSwapBusy) stay declared for that phase.
                // 2026-09-27, Phase C — REWARDS tab claim/estimate wiring for
                // ManageSponsorshipsPanel. Display strings parsed from
                // accountRecord via parseRewardDisplay(); claim callbacks use the
                // extension's executeClaimTransaction adapter (viem encodeFunctionData
                // + TradeExecutor/meritSign pipeline); estimate callbacks use the
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
            authenticationType: AuthenticationType.VAULT,
            onConfigLogoff: () => void vaultSession.lock(),
            onConfigResetPassword: openChangePassword,
            onConfigDeleteAccount: removeActiveAccount,
            onConfigDeleteWallet: () => {
              deleteWalletDialogOpen = true;
              render();
            },
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

  // 2026-09-16, on request ("do the same for the info.png in the lists")
  // — the token-list counterpart to handleAccountIconClick above, same
  // two-step/two-render shape. fetchTokenByAddress is the same real
  // /api/spCoin/tokens lookup buildTokenRows already uses for the list
  // itself; getTokenLogoURL is the same disk-path convention (independent
  // of whether a DB record exists) that fixed the earlier "not all images
  // are displayed" bug.
  async function handleTokenIconClick(address: string) {
    tokenDetail = null;
    render();
    const [logoSrc, record] = await Promise.all([
      getCachedTokenIconDataUrl(getTokenLogoURL(MERIT_WALLET_HARDHAT_CHAIN_ID, address), baseUrl),
      fetchTokenByAddress(MERIT_WALLET_HARDHAT_CHAIN_ID, address, { baseUrl }).catch(() => null),
    ]);
    tokenDetail = {
      address,
      logoSrc,
      name: record?.name,
      symbol: record?.symbol,
      decimals: record?.decimals,
      website: record?.website,
      explorer: record?.explorer,
      description: record?.description,
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
  function handleAccountRowSelect(accountId: string) {
    if (vaultRows) {
      // A vault account: the vault keeps the active choice; no hosted-app unlock exists or is needed.
      void vaultAccountsApi.setActive(accountId).then(() => {
        vaultActive = accountId;
        activateAccount(accountId);
      });
      return;
    }
    const address = accountId.trim().toLowerCase();
    const isLocked = lockStatusByAddress.get(address) ?? false;
    const alreadyUnlocked = unlockTokenAddress === address;

    if (isLocked && !alreadyUnlocked) {
      unlockPrompt = { address: accountId };
      unlockError = undefined;
      render();
      return;
    }

    activateAccount(accountId);
  }

  // Sets the picked account as the real ExchangeContextWalletSource's active address. The header and the list's ACTIVE badge follow it
  // through MeritWallet's activeAccountAddress prop (no per-row isActive flags are kept here any more).
  function activateAccount(accountId: string) {
    walletSource = { ...walletSource, address: accountId, isConnected: true };
    render();
    void fetchAccountRecord(accountId);
  }

  // Phase B.2 — fetches the on-chain AccountStruct for the active account
  // via /api/spCoin/run-script. Best-effort: a failed fetch just leaves
  // `accountRecord` as null; the panels that need real data degrade
  // gracefully (same "undefined, not a real-but-empty" pattern this file's
  // other data loaders already use). Uses the same baseUrl/chainId/rpcUrl
  // constants every other hardhat-specific call in this file does.
  async function fetchAccountRecord(address: string) {
    accountRecord = null;
    render();
    try {
      [accountRecord, rewardEstimate] = await Promise.all([
        // Both straight from the contract's views (2026-10-09, row 25): the record is the getAccountRecord view, the estimate the client-side calculation.
        chainRead('getAccountRecord', [{ key: 'Account Key', value: address }]),
        estimateRewardsByMethod('estimateOffChainTotalRewards', { accountKey: address, read: chainRead }).catch((error) => {
          console.error('Failed to load reward estimate:', error);
          return null;
        }),
      ]);
     } catch (error) {
       console.error('Failed to load account record:', error);
       accountRecord = null;
     }
     parseRewardDisplay();
     render();
   }

  async function handleUnlockSubmit(password: string) {
    if (!unlockPrompt) return;
    unlocking = true;
    unlockError = undefined;
    render();

    const address = unlockPrompt.address;
    const result = await unlockMeritWalletAccount(baseUrl, address, password);

    unlocking = false;
    if (!result.ok) {
      unlockError = result.message;
      render();
      return;
    }

    unlockToken = result.token;
    unlockTokenAddress = address.trim().toLowerCase();
    unlockPrompt = null;
    unlockError = undefined;
    activateAccount(address);
  }

  // Phase B.2 Stage 4 follow-up ("build actual trading functionality...
  // do it") — the first real trade-execution flow in the extension.
  // Native-currency only (see sendNative.ts's own header comment for why
  // an ERC20 tokenAddress is rejected rather than guessed at). Approval
  // gating (TransactionConfirmPanel) happens inside signAndSendMeritTransaction
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
    const useVault = !!vaultList?.ok && !!vaultList.accounts?.some((a) => a.address.toLowerCase() === from.trim().toLowerCase());
    const network = listConfiguredNetworks({ showTestNets: true }).find((row) => row.chainId === activeChainId);
    const result = await sendNativeMerit({
      useVault,
      baseUrl,
      chainId: MERIT_WALLET_HARDHAT_CHAIN_ID,
      rpcUrl: MERIT_WALLET_HARDHAT_RPC_URL,
      from,
      recipientAddress: params.recipientAddress,
       tokenAddress: params.tokenAddress,
       amount: params.amount,
       decimals: params.decimals,
       tokenSymbol: params.tokenSymbol,
       nativeSymbol: network?.symbol ?? 'ETH',
      unlockToken: unlockTokenAddress === from.trim().toLowerCase() ? (unlockToken ?? undefined) : undefined,
    });

    sendBusy = false;
    if (result.ok) sendAmount = '';
    render();
    // The wallet shows the result card (MESSAGE_PANEL) from what is returned, the same one the web app shows after a send.
    if (result.ok) void walletRefresh.run();
    return result.ok ? { ok: true, hash: result.hash, receipt: result.receipt as never } : { ok: false, message: result.message };
  }

  // 2026-09-26, Phase 4 — SPONSOR tab stake execution wiring.
  // Uses the portable executeStakeTransaction (from @sponsorcoin/spcoin-onchain
  // via @sponsorcoin/spcoin-exchange-engine) wrapped by the extension's own
  // executeStakeTransaction.ts adapter, which bridges to the Merit signing
  // pipeline via tradeExecutorMerit.ts.
  // NOTE: recipientKey/agentKey/rate-key resolution still need real wiring —
  // the current MeritWallet inert-fallback passes placeholder values (amount 0n,
  // rate keys 0). This handler wires the full path so it's ready for when real
  // inputs are threaded through.
  async function handleSponsorStakeSubmit(params: {
    recipientAddress?: string;
    agentAddress?: string;
    amount: bigint;
    recipientRateKey: number;
    agentRateKey: number;
  }): Promise<HostTransactionResult> {
    const from = walletSource.address;
    if (!from) return { ok: false, message: 'Select and activate an account first.' };

    sponsorStakeBusy = true;
    render();

    try {
      const recipientKey = params.recipientAddress ?? '';
      const agentKey = params.agentAddress ?? '';

      const result = await executeStakeTransaction({
        baseUrl,
        rpcUrl: MERIT_WALLET_HARDHAT_RPC_URL,
        recipientKey,
        agentKey,
        amountRaw: params.amount,
        desiredRecipientRateKey: params.recipientRateKey,
        desiredAgentRateKey: params.agentRateKey,
        recipientRateRange: [0, 100],
        agentRateRange: [0, 100],
        abi: SPOIN_STAKE_ABI,
        contractAddress: spCoinAddress(),
        chainId: MERIT_WALLET_HARDHAT_CHAIN_ID,
        fromAddress: from,
      });

      void walletRefresh.run();
      return result.transactionHash
        ? { ok: true, hash: result.transactionHash, receipt: result.receipt as never, methodName: (result as { methodName?: string }).methodName }
        : { ok: false, message: 'Stake completed with no transaction hash.' };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : String(error) };
    } finally {
      sponsorStakeBusy = false;
      sponsorStakeAmount = '';
      render();
     }
   }

   // 2026-09-27, Phase C — parse accountRecord + rewardEstimate into the display
   // strings + per-role rows that ManageSponsorshipsPanel expects. Uses the
   // same helpers exported from @sponsorcoin/spcoin-panels (readRecordValue,
   // formatAccountRecordAmount, getAccountRecordPendingReward, etc.) that the
   // web app's own ManageSponsorshipsPanel.tsx uses — keeping this extension's
   // parsing identical so rows look the same.
   function parseRewardDisplay() {
     if (!accountRecord) {
       rewardTradingText = '';
       rewardStakedText = '';
       rewardPendingText = '';
       rewardTotalCoinsText = '';
       rewardRows = [];
       return;
     }
      const rawBalance = readRecordValue(accountRecord, ['totalSpCoins', 'balanceOf']);
      const rawStaked = readRecordValue(accountRecord, ['totalSpCoins', 'stakedBalance']);
      const rawPending = getPendingRewardsTotalFromRecord(accountRecord);
      rewardTradingText = formatAccountRecordAmount(rawBalance, 18);
      rewardStakedText = formatAccountRecordAmount(rawStaked, 18);
      rewardPendingText = formatAccountRecordAmount(rawPending, 18);
      const toBigInt = (v: unknown): bigint => {
        const s = String(v ?? '0').replace(/,/g, '');
        try { return BigInt(s); } catch { return BigInt(0); }
      };
      rewardTotalCoinsText = formatAccountRecordAmount(
        toBigInt(rawBalance) + toBigInt(rawStaked) + toBigInt(rawPending),
        18,
      );
     // Per-role rows: amounts from the role-specific pendingRewards fields,
     // availability from the role flag bits in accountRecord.
     rewardRows = REWARD_ROLES.map((role) => {
       const config = REWARD_ROLE_CONFIG[role];
       const rawAmount = getAccountRecordPendingReward(accountRecord, role);
       const roleFlag = readRecordValue(accountRecord, [config.roleFlag]);
       const amount = rawAmount != null ? formatAccountRecordAmount(rawAmount, 18) : '0.0';
       return {
         role,
         amount,
         available: Boolean(roleFlag),
         loading: !!rewardRoleLoading[role],
       };
     });
   }

   // 2026-09-27, Phase C — total-reward estimate callback. Fires the extension's
   // estimateOffChainRewards client (spcoin_rread via /api/spCoin/run-script,
   // already CORS-trusted cross-origin). Updates rewardEstimate + re-parses
   // the display strings. On error, surfaces a message via pendingErrorText.
   async function handlePendingEstimate() {
     const from = walletSource.address;
     if (!from) {
       alert('Select and activate an account first.');
       return;
     }
     rewardEstimateBusy = true;
     rewardError = undefined;
     parseRewardDisplay();
     render();
     try {
       rewardEstimate = await estimateOffChainRewards(from, TOTAL_REWARD_CONFIG.estimateMethod, {
         baseUrl,
         contractAddress: spCoinAddress(),
         rpcUrl: MERIT_WALLET_HARDHAT_RPC_URL,
         chainId: MERIT_WALLET_HARDHAT_CHAIN_ID,
       });
       parseRewardDisplay();
     } catch (error) {
       rewardError = `Estimate failed: ${error instanceof Error ? error.message : String(error)}`;
       parseRewardDisplay();
     } finally {
       rewardEstimateBusy = false;
       render();
     }
   }

   // 2026-09-27, Phase C — per-role estimate callback. Fires the role-specific
   // estimate method (estimateOffChainSponsorRewards / Recipient / Agent).
   async function handleRoleEstimate(role: ManageSponsorshipRole) {
     const from = walletSource.address;
     if (!from) {
       alert('Select and activate an account first.');
       return;
     }
     const config = REWARD_ROLE_CONFIG[role];
     rewardRoleLoading[role] = true;
     rewardError = undefined;
     parseRewardDisplay();
     render();
     try {
        await estimateOffChainRewards(from, config.estimateMethod as Parameters<typeof estimateOffChainRewards>[1], {
         baseUrl,
         contractAddress: spCoinAddress(),
         rpcUrl: MERIT_WALLET_HARDHAT_RPC_URL,
         chainId: MERIT_WALLET_HARDHAT_CHAIN_ID,
       });
       parseRewardDisplay();
      } catch (error) {
        rewardError = `Estimate failed: ${error instanceof Error ? error.message : String(error)}`;
        rewardRoleLoading[role] = false;
        parseRewardDisplay();
        render();
        return;
      }
      rewardRoleLoading[role] = false;
      parseRewardDisplay();
      render();
    }


   // 2026-09-27, Phase C — total-reward claim (claimOnChainTotalRewards).
   // Uses the extension's executeClaimTransaction adapter: viem encodeFunctionData
   // + TradeExecutor (meritSign) pipeline. After confirmation, re-fetches accountRecord
   // to refresh all display strings.
   async function handlePendingClaim() {
     const from = walletSource.address;
     if (!from) {
       alert('Select and activate an account first.');
       return;
     }
     rewardClaimBusy = true;
     parseRewardDisplay();
     render();
     try {
       const result = await executeClaimTransaction({
         baseUrl,
         rpcUrl: MERIT_WALLET_HARDHAT_RPC_URL,
         accountKey: from,
         method: TOTAL_REWARD_CONFIG.claimMethod,
         abi: SPOIN_CLAIM_ABI,
         contractAddress: spCoinAddress(),
         chainId: MERIT_WALLET_HARDHAT_CHAIN_ID,
         fromAddress: from,
         onConfirmed: () => void fetchAccountRecord(from),
       });
       if (result.transactionHash) {
         alert(`Claim submitted. Transaction hash: ${result.transactionHash}`);
       }
     } catch (error) {
       alert(`Claim failed: ${error instanceof Error ? error.message : String(error)}`);
     } finally {
       rewardClaimBusy = false;
       await fetchAccountRecord(from);
       render();
     }
   }

   // 2026-09-27, Phase C — per-role claim callback.
   // Uses the role-specific claimOnChain* method.
   async function handleRoleClaim(role: ManageSponsorshipRole) {
     const from = walletSource.address;
     if (!from) {
       alert('Select and activate an account first.');
       return;
     }
     const config = REWARD_ROLE_CONFIG[role];
     rewardRoleLoading[role] = true;
     parseRewardDisplay();
     render();
     try {
       const result = await executeClaimTransaction({
         baseUrl,
         rpcUrl: MERIT_WALLET_HARDHAT_RPC_URL,
         accountKey: from,
          method: config.claimMethod as Parameters<typeof executeClaimTransaction>[0]['method'],
         abi: SPOIN_CLAIM_ABI,
         contractAddress: spCoinAddress(),
         chainId: MERIT_WALLET_HARDHAT_CHAIN_ID,
         fromAddress: from,
         onConfirmed: () => void fetchAccountRecord(from),
       });
       if (result.transactionHash) {
         alert(`Claim submitted. Transaction hash: ${result.transactionHash}`);
       }
     } catch (error) {
       alert(`Claim failed: ${error instanceof Error ? error.message : String(error)}`);
     } finally {
       rewardRoleLoading[role] = false;
       await fetchAccountRecord(from);
       render();
     }
   }

   function handleNetworkRowSelect(networkId: string) {
    const next = Number(networkId);
    if (!Number.isFinite(next) || next === activeChainId) return;
    activeChainId = next;
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
  lockStatusByAddress = requireVault ? new Map() : await fetchKeystoreLockStatus(baseUrl);
  render();
}

void renderWallet();
