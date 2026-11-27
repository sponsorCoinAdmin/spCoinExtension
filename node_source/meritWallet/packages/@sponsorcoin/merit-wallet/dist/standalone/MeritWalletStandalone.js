// File: src/standalone/MeritWalletStandalone.tsx
//
// 2026-11-18 (docs/design/standAloneWalletInstall.txt) -- the Merit Wallet as ONE component a page can mount with nothing but its chains:
//   <MeritWalletStandalone chains={[{ chainId: 31337, rpcUrl: 'https://rpc.example.org' }]} onClose={...} />
// It builds the host object itself (createStandaloneWallet: the browser vault, its authenticator, the wallet) and hands it to the same MeritWalletHostView the web app and the extension use, so it is the SAME wallet, not a copy.
// Layer 1: first-run setup (create / import / restore), unlock, lock, accounts. Balances, send and the trade tabs arrive in the next layers (their hosts are left out, so those panels show their empty state).
'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPublicClient, http } from 'viem';
import { walletFrameClassName, walletFrameStyle } from '@sponsorcoin/spcoin-common/styles';
import MeritWalletHostView from '../MeritWalletHostView';
import { domPlatform } from '../platform/domPlatform';
import StandaloneProviders from './StandaloneProviders';
import { listConfiguredNetworks } from '@sponsorcoin/spcoin-feeds/networks';
import { createStandaloneSend } from './standaloneSend';
import { useStandaloneApproval } from './useStandaloneApproval';
import { registerStandaloneEngineHosts } from './registerStandaloneEngineHosts';
import { registerStandaloneDebug } from './registerStandaloneDebug';
import { registerStandaloneData } from './registerStandaloneData';
import { createBalanceReader } from '../balance/createBalanceReader';
import { createStandaloneWallet } from './createStandaloneWallet';
export default function MeritWalletStandalone({ chains, core: given, onClose, docked = false, brandLogoSrc = '/assets/miscellaneous/meritWalletLogin.webp', data: snapshot, namespace, storage, sessionStore, autoLockMs }) {
    // registered before the first render, so the first thing the wallet reads already has its data
    useState(() => {
        if (snapshot)
            registerStandaloneData(snapshot);
    });
    const [core] = useState(() => given ?? createStandaloneWallet({ chains: chains ?? [], namespace, storage, sessionStore, autoLockMs }));
    // the engine's chain clients, registered before the first render so the first address check already has one
    useState(() => registerStandaloneEngineHosts(core.chains, core.approvals, core.authenticator));
    // the ladybug's dump: what this host is, the chain (endpoint host only) and the wallet's state, with no secrets
    useState(() => registerStandaloneDebug(core));
    // undefined while the first read is in flight: the screen stays blank so a wallet that exists never flashes the setup page.
    const [hasWallet, setHasWallet] = useState(undefined);
    // Setup stays up through the recovery-phrase step even though the vault already exists by then.
    const [setupOpen, setSetupOpen] = useState(false);
    // The active account's address, for the providers' wallet source (the vault's own choice, else its first account; none while locked).
    const [address, setAddress] = useState(undefined);
    const refresh = useCallback(async () => {
        setHasWallet(await core.vault.hasWallet().catch(() => false));
        try {
            setAddress(core.vault.isUnlocked() ? core.vault.activeAddress() ?? core.vault.accounts()[0]?.address : undefined);
        }
        catch {
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
    const chain = core.chains[0];
    // a stable balance reader over the chain's own endpoint (the wallet re-reads whenever this identity changes)
    const fetchBalance = useMemo(() => {
        const client = createPublicClient({ transport: http(chain.rpcUrl) });
        return createBalanceReader(() => client);
    }, [chain.rpcUrl]);
    // Send: the shared send over the vault's signer; the transaction waits in the approval queue, and the approval page (below) is what approves it.
    const nativeSymbol = listConfiguredNetworks({ showTestNets: true }).find((n) => n.chainId === chain.chainId)?.symbol ?? 'ETH';
    const addressRef = useRef(address);
    addressRef.current = address;
    const send = useMemo(() => createStandaloneSend({ authenticator: core.authenticator, chain, from: () => addressRef.current, nativeSymbol: () => nativeSymbol }), [core, chain, nativeSymbol]);
    const [sendAmount, setSendAmount] = useState('');
    const [sendBusy, setSendBusy] = useState(false);
    const onSendSubmit = useCallback(async (params) => {
        setSendBusy(true);
        try {
            const result = await send(params);
            if (result.ok)
                setSendAmount('');
            return result;
        }
        finally {
            setSendBusy(false);
        }
    }, [send]);
    const approvalPage = useStandaloneApproval(core.approvals, nativeSymbol);
    // the Swap tab's trade button: a recipient's site opens in a new tab; the confirm popup shows this wallet's chain; no hosted trading provider and no affiliate fee
    const tradeHost = useMemo(() => {
        const confirmHostState = { chainId: chain.chainId };
        return { onRecipientSiteClick: (href) => void domPlatform.openUrl?.(href), useConfirmHost: () => confirmHostState };
    }, [chain.chainId]);
    // The account list and its selection: the wallet builds the list from the vault (the wallet object) and asks the host to make an account active. Without this the list falls back to SAMPLE rows and a pick saves nothing.
    const approverHost = useMemo(() => ({
        nativeWalletId: 'browserVault',
        platform: 'web',
        setActiveAccount: async (picked) => {
            await core.vault.setActive(picked); // the vault remembers the choice across reloads
            setAddress(picked);
        },
        clearActiveAccount: () => setAddress(undefined),
        setActiveAuthenticator: (picked, id) => core.wallet.setActiveAuthenticator(picked, id),
    }), [core]);
    if (hasWallet === undefined)
        return null;
    const onboarding = hasWallet === false || setupOpen
        ? {
            createWallet: async (password) => {
                setSetupOpen(true);
                return core.onboarding.createWallet(password);
            },
            importWallet: async (phrase, password) => {
                setSetupOpen(true);
                await core.onboarding.importWallet(phrase, password);
            },
            restoreBackup: async (file, password) => {
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
            layout: { docked, onClose },
            data: { wallet: core.wallet, nativeWalletId: 'browserVault', approverHost,
                // the account list is the vault's (approverHost); giving the empty list up front stops the component asking a hosted app for test accounts (the "falling back to sample data" error)
                accountGroups: [], chainId: chain.chainId, baseUrl: '', activeAccountAddress: address ?? '', fetchBalance },
            selection: { approvalPage },
            actions: { sendAmount, onSendAmountChange: setSendAmount, sendBusy, onSendSubmit, tradeHost },
            lock: { onboarding, passwordIconSrc: brandLogoSrc },
        },
    });
    // The wallet draws its own dark card (border, fill, rounded corners) around its screens, but the first-run setup screen is returned bare (the extension's side panel is that screen's card). On a page it needs the same card, so it gets the wallet's own frame here.
    // 2026-11-27 (owner: the recovery phrase page was cut off at the bottom with no way to scroll, so the next step was out of reach): the first-run screens sit in this scroll region, so a page taller than the window scrolls (the frame itself clips).
    const framed = onboarding ? React.createElement('div', { className: walletFrameClassName, style: walletFrameStyle.frame(false, docked) }, React.createElement('div', { style: { flex: 1, minHeight: 0, overflowY: 'auto' } }, view)) : view;
    // The wallet reads its panel tree, display stack and exchange context from its surroundings: mounted here, from the page's own storage, so it never depends on (or shares state with) an app around it.
    return React.createElement(StandaloneProviders, { chainId: core.chains[0].chainId, address }, framed);
}
