// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/rewards/ConnectedRewardsPanel.tsx
//
// 2026-10-09 -- the Rewards tab with live data, written once for both hosts. The card is spcoin-panels' ManageSponsorshipsPanel and the state behind it (Trading and Staked
// from the account record, the Pending row's estimate and claim, the by-role rows, Auto Refresh) is the same useManageSponsorshipsData hook the web app's
// components/views/RadioOverlayPanels/ManageSponsorshipsPanel.tsx runs. What the web wrapper took from web-only modules is supplied here by the host through RewardsHost:
// where the run-script endpoint is, which contract and chain, and how a CLAIM is executed (the web app's server script; the extension signs it with the vault).
'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { useExchangeContext, usePanelVisible } from '@sponsorcoin/spcoin-exchange-engine';
import { ManageSponsorshipsPanel, createAccountRecordSource, runRewardScript as runRewardScriptCall, useManageSponsorshipsData, useManageSponsorshipsNavigation, } from '@sponsorcoin/spcoin-panels';
const noopRegisterRefresh = () => undefined;
const noopSubscribe = () => () => undefined;
const AUTO_REFRESH_KEY = 'spcoin_rewards_auto_refresh';
function readAutoRefresh() {
    try {
        return localStorage.getItem(AUTO_REFRESH_KEY) === 'true';
    }
    catch {
        return false;
    }
}
export default function ConnectedRewardsPanel({ host, extras = {} }) {
    const isActive = extras.isActive ?? true;
    const externalStore = extras.autoRefreshStore;
    const useRegisterRefresh = extras.useRegisterRefresh ?? noopRegisterRefresh;
    const { exchangeContext } = useExchangeContext();
    const pendingVisible = usePanelVisible(SP_COIN_DISPLAY.MANAGE_PENDING_REWARDS);
    const activeAccountAddr = String(exchangeContext?.apiCoreSyncedMembers?.accounts?.activeAccount?.address ?? '').trim();
    const activeContractAddr = host.contractAddress();
    const accessSource = host.accessSource ?? 'local';
    const [localAutoRefresh, setAutoRefresh] = useState(false);
    useEffect(() => setAutoRefresh(readAutoRefresh()), []);
    const sharedAutoRefresh = useSyncExternalStore(externalStore?.subscribe ?? noopSubscribe, externalStore?.getSnapshot ?? (() => false), externalStore?.getServerSnapshot ?? (() => false));
    const autoRefresh = externalStore ? sharedAutoRefresh : localAutoRefresh;
    const changeAutoRefresh = useCallback((next) => {
        if (externalStore) {
            externalStore.setUserPreference(next);
            return;
        }
        setAutoRefresh(next);
        try {
            localStorage.setItem(AUTO_REFRESH_KEY, String(next));
        }
        catch {
            /* storage may be unavailable; the checkbox still works for this session */
        }
    }, [externalStore]);
    const options = useMemo(() => (host.endpoint ? { endpoint: host.endpoint } : {}), [host.endpoint]);
    const runRewardScript = useCallback(async (method, action) => {
        if (action === 'claim' && host.claim) {
            const result = await host.claim(method, activeAccountAddr);
            host.onClaimed?.();
            return result ?? {};
        }
        if (action === 'estimate' && host.estimate)
            return host.estimate(method, activeAccountAddr);
        return runRewardScriptCall({ contractAddress: activeContractAddr, rpcUrl: host.rpcUrl, accessSource, readMode: host.readMode, accountKey: activeAccountAddr, method, action }, options);
    }, [host, activeAccountAddr, activeContractAddr, accessSource, options]);
    const accountRecordSource = useMemo(() => {
        const base = createAccountRecordSource({ rpcUrl: host.rpcUrl, accessSource, readMode: host.readMode }, options);
        const read = host.readAccountRecord;
        if (!read)
            return base;
        return { ...base, fetch: async ({ accountKey }) => ({ accountRecord: await read(accountKey), updatedAt: Date.now() }) };
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
    const { unstakeAllSponsorships, goToSponsorStakeTab, onOpenRewardsByAccountType, onCloseRewardsByAccountType } = useManageSponsorshipsNavigation({ pendingVisible });
    if (!isActive)
        return null;
    return (_jsx("div", { style: { position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }, children: _jsx(ManageSponsorshipsPanel, { tradingAmountText: tradingAmountDisplay, stakedAmountText: stakedAmountDisplay, pendingAmountText: pendingTotalAmountDisplay, totalCoinsText: totalCoinsDisplay, tradingOrStalledLoading: tradingOrStakedLoading, tradingIsZero: tradingIsZero, onStake: goToSponsorStakeTab, onUnstake: unstakeAllSponsorships, 
            // The web opens a role-account list here (ACTIVE_SPONSORSHIPS); without the web's list host that mode has nothing to draw and left the body blank. The accounts you
            // sponsor are the Un-Stake list's rows, so the label opens that list.
            onStakedLabelClick: unstakeAllSponsorships, stakedIsZero: stakedIsZero, autoRefresh: autoRefresh, onAutoRefreshChange: changeAutoRefresh, pendingVisible: pendingVisible, pendingInitialLoading: pendingInitialLoading, pendingRoleUnavailable: pendingRoleUnavailable, pendingIsZero: pendingIsZero, pendingClaimInProgress: totalReward.loading && totalReward.action === 'claim', pendingClaimDisabled: !pendingInitialLoading && ((totalReward.loading && totalReward.action === 'claim') || !activeContractAddr || !activeAccountAddr), pendingErrorText: totalReward.error, onPendingEstimate: () => {
                if (!pendingRoleUnavailable)
                    void runTotalRewardAction('estimate');
            }, onPendingClaim: () => void runTotalRewardAction('claim'), onOpenPendingGroup: onOpenRewardsByAccountType, onPendingHeaderEstimate: () => void runAvailableRoleRewardEstimates(), onClosePendingGroup: onCloseRewardsByAccountType, rewardRows: rewardRows, onRoleEstimate: (role) => void runRewardAction(role, 'estimate'), onRoleClaim: (role) => void runRewardAction(role, 'claim'), addressSelectContent: extras.addressSelectContent }) }));
}
