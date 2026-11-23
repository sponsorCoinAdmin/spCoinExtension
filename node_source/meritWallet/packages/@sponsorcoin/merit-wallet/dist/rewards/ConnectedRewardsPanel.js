// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/rewards/ConnectedRewardsPanel.tsx
//
// 2026-10-09 -- the Rewards tab with live data, written once for both hosts. The card is spcoin-panels' ManageSponsorshipsPanel and the state behind it (Trading and Staked
// from the account record, the Pending row's estimate and claim, the by-role rows, Auto Refresh) is the same useManageSponsorshipsData hook the web app's
// components/views/RadioOverlayPanels/ManageSponsorshipsPanel.tsx runs. What the web wrapper took from web-only modules is supplied here by the host through RewardsHost:
// where the run-script endpoint is, which contract and chain, and how a CLAIM is executed (the web app's server script; the extension signs it with the vault).
'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { panelBoxStyle } from '@sponsorcoin/spcoin-common/styles';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { usePlatform } from '../platform/platform';
import { setStakingListMode } from '../sponsor/stakingListMode';
import { createChainClock } from './chainClock';
import { meritDebug } from '../debug/debugStore';
import { withRoleFlags } from './accountRoleFlags';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { AssetSelectDisplayProvider, AssetSelectProvider, useExchangeContext, usePanelVisible } from '@sponsorcoin/spcoin-exchange-engine';
import { AddressSelect, AccountSelectDropDown, ASSET_SELECT_DISPLAY, ManageSponsorshipsPanel, createAccountRecordSource, runRewardScript as runRewardScriptCall, useManageSponsorshipsData, useManageSponsorshipsNavigation, } from '@sponsorcoin/spcoin-panels';
const noopRegisterRefresh = () => undefined;
const noopSubscribe = () => () => undefined;
const AUTO_REFRESH_KEY = 'spcoin_rewards_auto_refresh';
export default function ConnectedRewardsPanel({ host, extras = {} }) {
    const platform = usePlatform();
    const isActive = extras.isActive ?? true;
    const externalStore = extras.autoRefreshStore;
    const useRegisterRefresh = extras.useRegisterRefresh ?? noopRegisterRefresh;
    const { exchangeContext } = useExchangeContext();
    const pendingVisible = usePanelVisible(SP_COIN_DISPLAY.MANAGE_PENDING_REWARDS);
    const activeAccount = exchangeContext?.apiCoreSyncedMembers?.accounts?.activeAccount;
    // the account analysed: the one picked in the dropdown at the left of the Auto Refresh row, else the active account
    const pickedAccountAddr = String(extras.accountPicker?.address ?? '').trim();
    const activeAccountAddr = pickedAccountAddr || String(activeAccount?.address ?? '').trim();
    const activeContractAddr = host.contractAddress();
    const accessSource = host.accessSource ?? 'local';
    const [localAutoRefresh, setAutoRefresh] = useState(false);
    useEffect(() => setAutoRefresh(platform.storage.get(AUTO_REFRESH_KEY) === 'true'), [platform]);
    const sharedAutoRefresh = useSyncExternalStore(externalStore?.subscribe ?? noopSubscribe, externalStore?.getSnapshot ?? (() => false), externalStore?.getServerSnapshot ?? (() => false));
    const autoRefresh = externalStore ? sharedAutoRefresh : localAutoRefresh;
    const changeAutoRefresh = useCallback((next) => {
        if (externalStore) {
            externalStore.setUserPreference(next);
            return;
        }
        setAutoRefresh(next);
        platform.storage.set(AUTO_REFRESH_KEY, String(next));
    }, [externalStore]);
    const options = useMemo(() => (host.endpoint ? { endpoint: host.endpoint } : {}), [host.endpoint]);
    // one chain clock per host (its ticks and re-reads share the same anchor)
    const chainClock = useMemo(() => (host.blockTimestamp ? createChainClock(() => host.blockTimestamp()) : undefined), [host]);
    const runRewardScript = useCallback(async (method, action) => {
        if (action === 'claim' && host.claim) {
            const result = await host.claim(method, activeAccountAddr);
            host.onClaimed?.();
            return result ?? {};
        }
        if (action === 'estimate' && host.estimate) {
            if (!chainClock)
                throw new Error('This host estimates rewards but gives no blockTimestamp, so the estimate has no chain time to count from.');
            return host.estimate(method, activeAccountAddr, await chainClock.now());
        }
        return runRewardScriptCall({ contractAddress: activeContractAddr, rpcUrl: host.rpcUrl, accessSource, readMode: host.readMode, accountKey: activeAccountAddr, method, action }, options);
    }, [host, activeAccountAddr, activeContractAddr, accessSource, options, chainClock]);
    const accountRecordSource = useMemo(() => {
        const base = createAccountRecordSource({ rpcUrl: host.rpcUrl, accessSource, readMode: host.readMode }, options);
        const read = host.readAccountRecord;
        if (!read)
            return base;
        return { ...base, fetch: async ({ accountKey }) => ({ accountRecord: withRoleFlags(await read(accountKey)), updatedAt: Date.now() }) };
    }, [host, accessSource, options]);
    const { tradingAmountDisplay, stakedAmountDisplay, pendingTotalAmountDisplay, totalCoinsDisplay, tradingOrStakedLoading, tradingIsZero, stakedIsZero, pendingIsZero, pendingInitialLoading, pendingRoleUnavailable, totalReward, rewardRows, runTotalRewardAction, runRewardAction, runAvailableRoleRewardEstimates, refreshAccountRecord, } = useManageSponsorshipsData({
        isActive,
        pendingVisible,
        autoRefresh,
        activeAccountAddr,
        activeContractAddr,
        activeContractDecimals: host.decimals ?? 18,
        sourceKey: `${host.rpcUrl}|${accessSource}|${host.readMode}`,
        source: accountRecordSource,
        runRewardScript,
        trace: extras.trace ?? (() => undefined),
        warn: () => undefined,
    });
    useRegisterRefresh(refreshAccountRecord, isActive);
    // 2026-11-14 (debug dump): what this panel shows and the clock it counts from, in the same layout in every app. Read when the dump is built, from the latest values.
    const dumpState = useRef({ tradingAmountDisplay, stakedAmountDisplay, pendingTotalAmountDisplay, totalCoinsDisplay, pendingRoleUnavailable, totalReward, rewardRows, activeAccountAddr, activeContractAddr });
    dumpState.current = { tradingAmountDisplay, stakedAmountDisplay, pendingTotalAmountDisplay, totalCoinsDisplay, pendingRoleUnavailable, totalReward, rewardRows, activeAccountAddr, activeContractAddr };
    useEffect(() => {
        meritDebug.setSection('clock', async () => {
            const latest = host.blockTimestamp ? await host.blockTimestamp() : undefined;
            const chainNow = chainClock ? await chainClock.now() : undefined;
            return {
                chainNowSeconds: chainNow?.toString() ?? '(this host gives no blockTimestamp)',
                latestBlockSeconds: latest === undefined ? '(none)' : String(latest),
                // the computer's own calendar clock, shown only to explain a difference between two dumps (no reward figure uses it)
                computerUnixSeconds: String(Math.floor(Date.now() / 1000)),
                computerMinusChainSeconds: chainNow === undefined ? '(unknown)' : String(BigInt(Math.floor(Date.now() / 1000)) - chainNow),
            };
        });
        meritDebug.setSection('rewards', () => {
            const d = dumpState.current;
            return {
                contract: d.activeContractAddr,
                trading: d.tradingAmountDisplay,
                staked: d.stakedAmountDisplay,
                pendingTotal: d.pendingTotalAmountDisplay,
                totalCoins: d.totalCoinsDisplay,
                noRoleAtAll: d.pendingRoleUnavailable,
                roles: Object.fromEntries(d.rewardRows.map((row) => [row.role, row.available ? `${row.amount}${row.loading ? ' (loading)' : ''}${row.error ? ` ERROR ${String(row.error)}` : ''}` : 'N/A'])),
                totalReward: d.totalReward,
            };
        });
        meritDebug.setSection('account', () => ({ activeAccount: dumpState.current.activeAccountAddr }));
        return () => {
            meritDebug.setSection('clock', undefined);
            meritDebug.setSection('rewards', undefined);
        };
    }, [host, chainClock]);
    const { unstakeAllSponsorships, goToSponsorStakeTab, onOpenRewardsByAccountType, onCloseRewardsByAccountType } = useManageSponsorshipsNavigation({ pendingVisible });
    if (!isActive)
        return null;
    return (_jsx("div", { style: panelBoxStyle.fill, children: _jsx(ManageSponsorshipsPanel, { tradingAmountText: tradingAmountDisplay, stakedAmountText: stakedAmountDisplay, pendingAmountText: pendingTotalAmountDisplay, totalCoinsText: totalCoinsDisplay, tradingOrStalledLoading: tradingOrStakedLoading, tradingIsZero: tradingIsZero, onStake: goToSponsorStakeTab, onUnstake: () => { setStakingListMode({ kind: 'unstake' }); unstakeAllSponsorships(); }, 
            // The Staked label does nothing on a click (owner request 2026-11-13); the Unstake button is the way to the Un-Stake list.
            stakedIsZero: stakedIsZero, autoRefresh: autoRefresh, onAutoRefreshChange: changeAutoRefresh, pendingVisible: pendingVisible, pendingInitialLoading: pendingInitialLoading, pendingRoleUnavailable: pendingRoleUnavailable, pendingIsZero: pendingIsZero, pendingClaimInProgress: totalReward.loading && totalReward.action === 'claim', pendingClaimDisabled: !pendingInitialLoading && ((totalReward.loading && totalReward.action === 'claim') || !activeContractAddr || !activeAccountAddr), pendingErrorText: totalReward.error, onPendingEstimate: () => {
                if (!pendingRoleUnavailable)
                    void runTotalRewardAction('estimate');
            }, onPendingClaim: () => void runTotalRewardAction('claim'), onOpenPendingGroup: onOpenRewardsByAccountType, onPendingHeaderEstimate: () => void runAvailableRoleRewardEstimates(), onClosePendingGroup: onCloseRewardsByAccountType, rewardRows: rewardRows, onRoleEstimate: (role) => void runRewardAction(role, 'estimate'), 
            // 2026-11-13 (owner): every role's Claim opens the sponsorships list in Claim mode (Sponsor: what you sponsor; Recipient / Agent: who sponsors you); its buttons claim
            onRoleClaim: (role) => {
                // the Claim list is built for the account the Rewards pill shows (the picked account, else the active one), not always the active account
                setStakingListMode({ kind: 'claim', role, account: pickedAccountAddr || undefined });
                unstakeAllSponsorships();
            }, accountSelectContent: extras.accountPicker ? (_jsx(AccountSelectDropDown, { rootId: "REWARDS_ACCOUNT_SELECT_DROP_DOWN", hasEntity: !!activeAccountAddr, address: activeAccountAddr, symbol: pickedAccountAddr ? undefined : activeAccount?.symbol, name: pickedAccountAddr ? undefined : activeAccount?.name, label: "Select Account", copyLabel: "Copy Account Address", showDisplay: ASSET_SELECT_DISPLAY.ICON |
                    ASSET_SELECT_DISPLAY.SYMBOL |
                    ASSET_SELECT_DISPLAY.NAME |
                    ASSET_SELECT_DISPLAY.ADDRESS |
                    ASSET_SELECT_DISPLAY.COPY |
                    ASSET_SELECT_DISPLAY.CHEVRON_DN |
                    ASSET_SELECT_DISPLAY.ADDR_COMP, onSelectClick: () => extras.accountPicker?.onPick(), addrPrePostSize: 4 })) : undefined, addressSelectContent: _jsx(AssetSelectDisplayProvider, { children: _jsx(AssetSelectProvider, { containerType: SP_COIN_DISPLAY.MANAGE_SPONSORSHIPS_PANEL, closePanelCallback: () => extras.onClose?.(), setSelectedAssetCallback: () => undefined, children: _jsx(AddressSelect, { callingParent: "ManageSponsorshipsPanel", defaultAddress: extras.depositAddress ?? host.contractAddress(), bypassDefaultFsm: true, useActiveAddr: true, shortAddr: true, preText: "Deposit Account:", showAccount: false }) }) }) }) }));
}
