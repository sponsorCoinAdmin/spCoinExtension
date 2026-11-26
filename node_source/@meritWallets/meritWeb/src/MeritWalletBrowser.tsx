// File: src/MeritWalletBrowser.tsx
//
// 2026-11-18 (docs/design/standAloneWalletInstall.txt) -- the Merit Wallet as ONE component a page can mount with nothing but its chains:
//   <MeritWalletBrowser chains={[{ chainId: 31337, rpcUrl: 'https://rpc.example.org' }]} onClose={...} />
// It builds the host object itself (createBrowserWallet: the browser vault, its authenticator, the wallet) and hands it to the same MeritWalletHostView the web app and the extension use, so it is the SAME wallet, not a copy.
// It supplies: first-run setup (create / import / restore), unlock and lock, the vault's account list and active account, balances, Send, Swap and the approval page. The Rewards tab and the Sponsor tab's staking list read the chain through browserSponsor.ts.
'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { walletFrameClassName, walletFrameStyle } from '@sponsorcoin/spcoin-common/styles';
import { MeritWalletType, type MeritPlatform, accountDetailHostFromProfile, ensureAbsoluteAssetURL, type AddAccountHost, MeritWalletHostView, createSecuritySetup, type SecuritySetupHost, createBalanceReader, domPlatform, meritDebug, type BalanceClient, type StakeConfirmHostState, type TradeHost } from '@sponsorcoin/merit-wallet';
import { DisplaySizePanel, DisplayScaleProvider } from '@sponsorcoin/spcoin-panels';
import { DISPLAY_PERCENT_MAX, DISPLAY_PERCENT_MIN, useDisplayScale } from './displayScale';
import { reloadFromServer } from './reloadFromServer';
import { claimBrowserStorage } from './claimBrowserStorage';
import { useBackButtonSync } from './useBackButtonSync';
import { publicClientFor } from './chainClients';
import BrowserProviders from './BrowserProviders';
import { getNetworkConfiguration, listConfiguredNetworks } from '@sponsorcoin/spcoin-feeds/networks';
import { describeRecents, engineTrace, loadAccountRecord, useAppChainId } from '@sponsorcoin/spcoin-exchange-engine';
import { createBrowserSponsorHosts } from './browserSponsor';
import { createBrowserSend, type BrowserSendParams } from './browserSend';
import { useBrowserApproval } from './useBrowserApproval';
import { registerBrowserEngineHosts } from './registerBrowserEngineHosts';
import { registerBrowserDebug } from './registerBrowserDebug';
import { registerBrowserData, type BrowserDataSnapshot } from './registerBrowserData';
import { createBrowserWallet, type BrowserChain, type BrowserWallet, type BrowserWalletOptions } from './createBrowserWallet';

export interface MeritWalletBrowserProps extends Omit<BrowserWalletOptions, 'chains'> {
  /** The chains the wallet works on. Ignored when `core` is given. */
  chains?: readonly BrowserChain[];
  /** The static data snapshot (the shared data package's bundledFeedData.json): networks, token lists, account lists. Without it the wallet has no network or token lists to show. */
  data?: BrowserDataSnapshot;
  /** The image on the login and setup screens. Default: the Merit login art under /assets/miscellaneous (the data package's assets folder, served by the page like every other image the wallet asks for). */
  brandLogoSrc?: string;
  /** The Config tab's Test Accounts section, built by the page (it comes from @meritWallets/meritDevSite, which never ships in a release). Omitted: no section. */
  configTestAccountsContent?: React.ReactNode;
  /** 2026-11-24 (owner): the Config tab's Test Sites section (test code from @meritWallets/meritDevSite). Omitted in a release. */
  configTestSitesContent?: React.ReactNode;
  /** A wallet the page already created (to share one wallet between several mounts). Omitted: one is created for this mount. */
  core?: BrowserWallet;
  onClose: () => void;
  docked?: boolean;
  /** 2026-11-24 (owner): the type shown in the Config title. Always WEB for this package (the public wallet and the dev app are both WEB). */
  walletType?: MeritWalletType;
  /** 2026-11-24 (owner: the iframe wallet): the device actions (copy, open an address...). Omitted: the DOM implementation, as before. A framed wallet passes one that asks its parent. */
  platform?: MeritPlatform;
  /** 2026-11-26 (owner): the sign-in options (Use password, passkey, authenticator app) the Config tab's one Wallet Security section shows, the same as the web app's. Omitted: this package makes one over this browser's local storage and passkeys. */
  securitySetup?: SecuritySetupHost;
  /** 2026-11-19: fill the width of the container the page puts the wallet in (a phone, a popup, a frame) instead of the wallet's own fixed width. */
  fullWidth?: boolean;
}

/** 2026-11-20: inside the providers, the engine's app chain follows the wallet's chain pick (the Swap tab and the engine's clients read the app chain). Only when the pick changes, so the engine's own mapping of a chain (a Base fork) is not fought. */
function ChainFollower({ chainId }: { chainId: number }) {
  const [, setAppChainId] = useAppChainId();
  useEffect(() => {
    setAppChainId(chainId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainId]);
  return null;
}

export default function MeritWalletBrowser({ chains, core: given, onClose, walletType = MeritWalletType.WEB, platform, securitySetup: givenSecuritySetup, docked = false, fullWidth = false, brandLogoSrc = '/assets/miscellaneous/meritWalletLogin.webp', configTestAccountsContent, configTestSitesContent, data: snapshot, namespace, storage, sessionStore, autoLockMs }: MeritWalletBrowserProps) {
  // 2026-11-26 (owner: the same Wallet Security section as the web app): one sign-in options store over this browser's own storage; the label is what the authenticator app and the passkey list show
  const securitySetup = useMemo(
    () => givenSecuritySetup ?? createSecuritySetup({
      storage: () => (typeof window === 'undefined' ? undefined : window.localStorage),
      credentials: () => (typeof navigator === 'undefined' ? undefined : navigator.credentials),
      accountLabel: `Merit Wallet (${String(walletType).replace('_', ' ')})`,
    }),
    [givenSecuritySetup, walletType],
  );
  // 2026-11-20: first, before anything reads saved state: drop what another app left in this address's localStorage (the old web app's saved screens kept the wallet on its login screen)
  useState(() => {
    const removed = claimBrowserStorage();
    if (removed.length) meritDebug.log('page', `removed ${removed.length} saved entr${removed.length === 1 ? 'y' : 'ies'} left by another app: ${removed.join(', ')}`);
  });
  // 2026-11-20: the page's display size (saved in this browser, a phone default), with its slider on the Config tab
  const displayScale = useDisplayScale();
  // 2026-11-20: the phone's back button (the browser's Back) does what the wallet's own back arrow does
  const onNavigationChange = useBackButtonSync();
  // 2026-11-20: the header's refresh button reloads the wallet from the server, bypassing the browser's saved copy of the page
  const [reloading, setReloading] = useState(false);
  const onRefresh = useCallback(() => {
    if (reloading) return;
    setReloading(true);
    void reloadFromServer();
  }, [reloading]);
  // registered before the first render, so the first thing the wallet reads already has its data
  useState(() => {
    if (snapshot) registerBrowserData(snapshot);
  });
  const [core] = useState<BrowserWallet>(() => given ?? createBrowserWallet({ chains: chains ?? [], namespace, storage, sessionStore, autoLockMs }));
  // the engine's chain clients, registered before the first render so the first address check already has one
  useState(() => registerBrowserEngineHosts(core.chains, core.approvals, core.authenticator));
  // the ladybug's dump: what this host is, the chain (endpoint host only) and the wallet's state, with no secrets
  useState(() => registerBrowserDebug(core));
  // the Recent pick lists in the dump (mode and addresses: they decide what the pickers open on); here, not in registerBrowserDebug, so that file stays free of the engine and runs under node tests
  useState(() => meritDebug.setSection('recents', () => describeRecents()));
  // undefined while the first read is in flight: the screen stays blank so a wallet that exists never flashes the setup page.
  const [hasWallet, setHasWallet] = useState<boolean | undefined>(undefined);
  // Setup stays up through the recovery-phrase step even though the vault already exists by then.
  const [setupOpen, setSetupOpen] = useState(false);
  // The active account's address, for the providers' wallet source (the vault's own choice, else its first account; none while locked).
  const [address, setAddress] = useState<string | undefined>(undefined);

  const refresh = useCallback(async () => {
    setHasWallet(await core.vault.hasWallet().catch(() => false));
    try {
      setAddress(core.vault.isUnlocked() ? core.vault.activeAddress() ?? core.vault.accounts()[0]?.address : undefined);
    } catch {
      setAddress(undefined);
    }
  }, [core]);

  useEffect(() => {
    let live = true;
    void core.restore().then(() => (live ? refresh() : undefined));
    const off = core.vault.onChange(() => void refresh());
    // any account change (added, removed, made active) re-reads the active address, whoever made it
    const offAccounts = core.authenticator.onChange(() => void refresh());
    return () => {
      live = false;
      off();
      offAccounts();
    };
  }, [core, refresh]);

  // 2026-11-20 (owner report: choosing a network from the list changed nothing): the active chain is state, set by the list's pick (onNetworkRowSelect) and remembered on this device. A chain the page configured comes first; any other network in
  // the registry that has an endpoint works too (reads, balances, native sends); a network with no endpoint cannot be chosen.
  const resolveChain = useCallback((id: number): BrowserChain | undefined => {
    const configured = core.chains.find((c) => c.chainId === id);
    if (configured) return configured;
    const net = getNetworkConfiguration(id);
    return net?.rpcUrl ? { chainId: id, rpcUrl: net.rpcUrl, name: net.name } : undefined;
  }, [core]);
  const [activeChainId, setActiveChainId] = useState<number>(() => {
    try {
      const saved = Number(localStorage.getItem('merit.activeChain.v1'));
      if (Number.isInteger(saved) && saved > 0 && (core.chains.some((c) => c.chainId === saved) || getNetworkConfiguration(saved)?.rpcUrl)) return saved;
    } catch {
      // storage blocked: the first configured chain
    }
    return core.chains[0].chainId;
  });
  const chain = useMemo(() => resolveChain(activeChainId) ?? core.chains[0], [resolveChain, activeChainId, core]);
  // the ladybug's dump: the chain the wallet is on now and where its endpoint came from (host only)
  const chainRef = useRef(chain);
  chainRef.current = chain;
  useState(() => meritDebug.setSection('network', () => {
    const c = chainRef.current;
    const host = (() => { try { return new URL(c.rpcUrl).host; } catch { return '(unreadable)'; } })();
    return { activeChainId: c.chainId, name: c.name ?? getNetworkConfiguration(c.chainId)?.name ?? '', endpointHost: host, endpointFrom: core.chains.some((x) => x.chainId === c.chainId) ? 'page' : 'network registry', savedChoice: (() => { try { return localStorage.getItem('merit.activeChain.v1') ?? '(none)'; } catch { return '(storage blocked)'; } })(), pageChains: core.chains.map((x) => x.chainId).join(',') };
  }));
  const onNetworkRowSelect = useCallback((id: string) => {
    const next = Number(id);
    // the debug pane's view of every pick, and why a pick did nothing (never the endpoint itself: it can carry an access token)
    const target = Number.isInteger(next) ? resolveChain(next) : undefined;
    engineTrace('browser:networkSelect', { picked: id, from: activeChainId, configuredByPage: core.chains.some((c) => c.chainId === next), inRegistry: !!getNetworkConfiguration(next), hasEndpoint: !!target, result: !Number.isInteger(next) ? 'ignored: not a chain id' : next === activeChainId ? 'ignored: already active' : !target ? 'refused: no endpoint for this chain' : 'switched' });
    if (!Number.isInteger(next) || next === activeChainId || !target) return;
    setActiveChainId(next);
    try {
      localStorage.setItem('merit.activeChain.v1', String(next));
    } catch {
      // storage blocked: the choice lasts until the page closes
    }
    meritDebug.log('page', `network changed to ${next}`);
  }, [activeChainId, resolveChain, core]);
  // a stable balance reader over the chain's own endpoint (the wallet re-reads whenever this identity changes)
  const fetchBalance = useMemo(() => {
    const client = publicClientFor(chain.rpcUrl);
    return createBalanceReader(() => client as unknown as BalanceClient);
  }, [chain.rpcUrl]);

  // Send: the shared send over the vault's signer; the transaction waits in the approval queue, and the approval page (below) is what approves it.
  const nativeSymbol = listConfiguredNetworks({ showTestNets: true }).find((n) => n.chainId === chain.chainId)?.symbol ?? 'ETH';
  const addressRef = useRef<string | undefined>(address);
  addressRef.current = address;
  const send = useMemo(
    () => createBrowserSend({ authenticator: core.authenticator, chain, from: () => addressRef.current, nativeSymbol: () => nativeSymbol }),
    [core, chain, nativeSymbol],
  );
  const [sendAmount, setSendAmount] = useState('');
  const [sendBusy, setSendBusy] = useState(false);
  const onSendSubmit = useCallback(
    async (params: BrowserSendParams) => {
      setSendBusy(true);
      try {
        const result = await send(params);
        if (result.ok) setSendAmount('');
        return result;
      } finally {
        setSendBusy(false);
      }
    },
    [send],
  );
  const approvalPage = useBrowserApproval(core.approvals, nativeSymbol, chain.rpcUrl);
  // the Swap tab's trade button: a recipient's site opens in a new tab; the confirm popup shows this wallet's chain; no hosted trading provider and no affiliate fee
  const tradeHost = useMemo<TradeHost>(() => {
    const confirmHostState: StakeConfirmHostState = { chainId: chain.chainId };
    return { onRecipientSiteClick: (href: string) => void domPlatform.openUrl?.(href), useConfirmHost: () => confirmHostState };
  }, [chain.chainId]);

  // The account list and its selection: the wallet builds the list from the vault (the wallet object) and asks the host to make an account active. Without this the list falls back to SAMPLE rows and a pick saves nothing.
  const approverHost = useMemo(
    () => ({
      nativeWalletId: 'browserVault' as const,
      platform: 'web' as const,
      setActiveAccount: async (picked: string) => {
        await core.vault.setActive(picked); // the vault remembers the choice across reloads
        setAddress(picked);
      },
      clearActiveAccount: () => setAddress(undefined),
      setActiveAuthenticator: (picked: string, id: Parameters<typeof core.wallet.setActiveAuthenticator>[1]) => core.wallet.setActiveAuthenticator(picked, id),
    }),
    [core],
  );

  // the Rewards tab and the Sponsor tab's staking list: contract reads over the page's RPC, claims and un-stakes through the approval queue
  const sponsorHosts = useMemo(
    () => createBrowserSponsorHosts({ authenticator: core.authenticator, chainId: chain.chainId, rpcUrl: chain.rpcUrl, from: () => addressRef.current, onChanged: () => void refresh() }),
    [core, chain.chainId, chain.rpcUrl, refresh],
  );

  // 2026-11-23 (owner: the account image's right click opens Account Details): the shared account detail screen over this vault, as the extension has it: the vault says which accounts the wallet may edit and signs a profile save behind the approval page
  const accountDetailHost = useMemo(
    () =>
      accountDetailHostFromProfile({
        canEdit: (a) => core.vault.accounts().some((row) => row.address.toLowerCase() === a.toLowerCase()),
        resolveAvatar: async (a) => {
          const url = String(((await loadAccountRecord(a).catch(() => undefined)) as { logoURL?: unknown } | undefined)?.logoURL ?? '');
          return url ? ensureAbsoluteAssetURL(url) : undefined;
        },
        signMessage: (a, message) => core.authenticator.signMessage(a, message, { title: 'Save account profile', message: 'Sign in to the account service to publish this account profile. This does not send a transaction.' }),
      }),
    [core],
  );

  // 2026-11-24 (owner: the Accounts drop-down (Add Account / Import Account / Import Wallet) did nothing here while the extension opened its screens): the wallet draws those screens only when the host supplies this. It adds to THIS browser's vault: the next account of its recovery phrase, or one imported by private key.
  const addAccountHost = useMemo<AddAccountHost>(
    () => ({
      targets: ['browserVault'],
      createAccount: async (_targetId, profile) => {
        const added = await core.vault.addAccount(profile?.name?.trim() || undefined);
        await core.vault.setActive(added.address);
        setAddress(added.address);
      },
      importAccount: async (privateKey, _targetId, profile) => {
        const added = await core.vault.importKey(privateKey, profile?.name?.trim() || undefined);
        await core.vault.setActive(added.address);
        setAddress(added.address);
      },
      // a second recovery phrase cannot sit beside the first in this browser's vault (importing one replaces the wallet), so the entry is offered but disabled with its reason
      unavailable: { importWallet: 'This browser wallet keeps one recovery phrase. Import a wallet from its setup screen.' },
    }),
    [core],
  );

  if (hasWallet === undefined) return null;

  const onboarding =
    hasWallet === false || setupOpen
      ? {
          createWallet: async (password: string) => {
            setSetupOpen(true);
            return core.onboarding.createWallet(password);
          },
          importWallet: async (phrase: string, password: string) => {
            setSetupOpen(true);
            await core.onboarding.importWallet(phrase, password);
          },
          restoreBackup: async (file: string, password: string) => {
            setSetupOpen(true);
            await core.onboarding.restoreBackup(file, password);
          },
          onDone: () => {
            setSetupOpen(false);
            void refresh();
          },
        }
      : undefined;

  const view = React.createElement(MeritWalletHostView, {
    host: {
      layout: { walletType, docked, fullWidth, onClose, onRefresh, refreshing: reloading, onNavigationChange, seedTabOnStack: true },
      data: { wallet: core.wallet, nativeWalletId: 'browserVault', approverHost,
        // the account list is the vault's (approverHost); giving the empty list up front stops the component asking a hosted app for test accounts (the "falling back to sample data" error)
        accountGroups: [], chainId: chain.chainId, baseUrl: '', activeAccountAddress: address ?? '', fetchBalance, rewardsHost: sponsorHosts.rewardsHost, stakingHost: sponsorHosts.stakingHost },
      selection: { approvalPage, onNetworkRowSelect, accountDetailHost, addAccountHost },
      slots: {
        configTestAccountsContent,
        configTestSitesContent,
        configDisplaySizeContent: React.createElement(DisplaySizePanel, { percent: displayScale.percent, onPercentChange: (next: number) => (next === displayScale.defaultPercent ? displayScale.reset() : displayScale.setPercent(next)), defaultPercent: displayScale.defaultPercent, min: DISPLAY_PERCENT_MIN, max: DISPLAY_PERCENT_MAX }),
      },
      actions: { sendAmount, onSendAmountChange: setSendAmount, sendBusy, onSendSubmit, tradeHost },
      lock: { onboarding, passwordIconSrc: brandLogoSrc, securitySetup },
      platform: platform ? { platform } : undefined,
    },
  });
  // The wallet draws its own dark card (border, fill, rounded corners) around its screens, but the first-run setup screen is returned bare (the extension's side panel is that screen's card). On a page it needs the same card, so it gets the wallet's own frame here.
  const framed = onboarding ? React.createElement('div', { className: walletFrameClassName, style: walletFrameStyle.frame(fullWidth, docked) }, view) : view;
  // The wallet reads its panel tree, display stack and exchange context from its surroundings: mounted here, from the page's own storage, so it never depends on (or shares state with) an app around it.
  // 2026-11-24 (owner): a pinch on a header bar changes this page's Display Size (the same one the Config slider sets; a size equal to the screen's default is the default again)
  const pinchDisplay = (next: number) => (next === displayScale.defaultPercent ? displayScale.reset() : displayScale.setPercent(next));
  return React.createElement(BrowserProviders, { chainId: chain.chainId, address }, React.createElement(DisplayScaleProvider, { percent: displayScale.percent, onChange: pinchDisplay, min: DISPLAY_PERCENT_MIN, max: DISPLAY_PERCENT_MAX }, React.createElement(ChainFollower, { chainId: chain.chainId }), framed));
}
