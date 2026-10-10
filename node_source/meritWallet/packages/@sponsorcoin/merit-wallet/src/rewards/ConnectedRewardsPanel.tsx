// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/rewards/ConnectedRewardsPanel.tsx
//
// 2026-10-09 -- the Rewards tab with live data, written once for both hosts. The card is spcoin-panels' ManageSponsorshipsPanel and the state behind it (Trading and Staked
// from the account record, the Pending row's estimate and claim, the by-role rows, Auto Refresh) is the same useManageSponsorshipsData hook the web app's
// components/views/RadioOverlayPanels/ManageSponsorshipsPanel.tsx runs. What the web wrapper took from web-only modules is supplied here by the host through RewardsHost:
// where the run-script endpoint is, which contract and chain, and how a CLAIM is executed (the web app's server script; the extension signs it with the vault).
'use client';

import React, { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { useExchangeContext, usePanelVisible } from '@sponsorcoin/spcoin-exchange-engine';
import {
  ManageSponsorshipsPanel,
  createAccountRecordSource,
  runRewardScript as runRewardScriptCall,
  useManageSponsorshipsData,
  useManageSponsorshipsNavigation,
  type AccountRecordSource,
  type RewardAction,
} from '@sponsorcoin/spcoin-panels';

export interface RewardsHost {
  /** The active spCoin contract. */
  contractAddress(): string;
  /** Decimals of the spCoin (default 18). */
  decimals?: number;
  rpcUrl: string;
  accessSource?: 'node_modules' | 'local';
  readMode: 'hardhat' | 'metamask';
  /** Absolute URL of the run-script endpoint the estimate and record reads use (the extension passes the hosted app's). Omit for the same-origin default. */
  endpoint?: string;
  /**
   * Execute a CLAIM (action 'claim') for `accountKey`. Resolves with whatever the host has (the hook only needs the amounts the server script reports, and
   * falls back to zero, then re-reads); throws a readable message on rejection or failure. Omit and claims go to the run-script endpoint, as in the web app.
   */
  claim?(method: string, accountKey: string): Promise<unknown>;
  /**
   * Read the account's on-chain record (the contract's getAccountRecord view) directly, so Trading and Staked need no hosted app; resolves with the record keyed by its
   * output names (accountBalance, stakedAccountSPCoins, ...). Omit and the record comes from the run-script endpoint, as in the web app.
   */
  readAccountRecord?(accountKey: string): Promise<unknown>;
  /**
   * Compute a pending-reward ESTIMATE (estimateOffChainTotal / Sponsor / Recipient / AgentRewards) in the client from direct contract reads (rewards/estimateRewards.ts), so the Pending row needs no hosted app.
   * Resolves with the result object (pendingSponsorRewards, ..., pendingTotalRewards). Omit and estimates go to the run-script endpoint, as in the web app.
   */
  estimate?(method: string, accountKey: string): Promise<unknown>;
  /** Called after a claim confirmed, so the host can refresh balances. */
  onClaimed?(): void;
}

/** What a host may add around the panel (the web app's wrapper supplies all of these; the extension needs none). */
export interface RewardsPanelExtras {
  /** Show nothing while false (the web keeps the component mounted so its state survives the panel being closed). Default true. */
  isActive?: boolean;
  /** A shared Auto Refresh store instead of this panel's own saved preference (the web app's autoRefreshStore also lets other code switch it off temporarily). */
  autoRefreshStore?: { subscribe(listener: () => void): () => void; getSnapshot(): boolean; getServerSnapshot(): boolean; setUserPreference(next: boolean): void };
  /** The "Deposit Account" row the web shows above the table. */
  addressSelectContent?: React.ReactNode;
  /** Debug trace sink. */
  trace?: (message: string, data?: Record<string, unknown>) => void;
  /** A hook that registers the panel's refresh function with the host's refresh bus (the web's useCacheRefreshHandler). Must be a stable function. */
  useRegisterRefresh?: (refresh: () => void | Promise<void>, active: boolean) => void;
}

const noopRegisterRefresh = () => undefined;
const noopSubscribe = () => () => undefined;

const AUTO_REFRESH_KEY = 'spcoin_rewards_auto_refresh';

function readAutoRefresh(): boolean {
  try {
    return localStorage.getItem(AUTO_REFRESH_KEY) === 'true';
  } catch {
    return false;
  }
}

export default function ConnectedRewardsPanel({ host, extras = {} }: { host: RewardsHost; extras?: RewardsPanelExtras }) {
  const isActive = extras.isActive ?? true;
  const externalStore = extras.autoRefreshStore;
  const useRegisterRefresh = extras.useRegisterRefresh ?? noopRegisterRefresh;
  const { exchangeContext } = useExchangeContext();
  const pendingVisible = usePanelVisible(SP_COIN_DISPLAY.MANAGE_PENDING_REWARDS);
  const activeAccountAddr = String(exchangeContext?.apiCoreSyncedMembers?.accounts?.activeAccount?.address ?? '').trim();
  const activeContractAddr = host.contractAddress();
  const accessSource = host.accessSource ?? 'local';

  const [localAutoRefresh, setAutoRefresh] = useState<boolean>(false);
  useEffect(() => setAutoRefresh(readAutoRefresh()), []);
  const sharedAutoRefresh = useSyncExternalStore(externalStore?.subscribe ?? noopSubscribe, externalStore?.getSnapshot ?? (() => false), externalStore?.getServerSnapshot ?? (() => false));
  const autoRefresh = externalStore ? sharedAutoRefresh : localAutoRefresh;
  const changeAutoRefresh = useCallback((next: boolean) => {
    if (externalStore) {
      externalStore.setUserPreference(next);
      return;
    }
    setAutoRefresh(next);
    try {
      localStorage.setItem(AUTO_REFRESH_KEY, String(next));
    } catch {
      /* storage may be unavailable; the checkbox still works for this session */
    }
  }, [externalStore]);

  const options = useMemo(() => (host.endpoint ? { endpoint: host.endpoint } : {}), [host.endpoint]);

  const runRewardScript = useCallback(
    async (method: string, action: RewardAction): Promise<unknown> => {
      if (action === 'claim' && host.claim) {
        const result = await host.claim(method, activeAccountAddr);
        host.onClaimed?.();
        return result ?? {};
      }
      if (action === 'estimate' && host.estimate) return host.estimate(method, activeAccountAddr);
      return runRewardScriptCall({ contractAddress: activeContractAddr, rpcUrl: host.rpcUrl, accessSource, readMode: host.readMode, accountKey: activeAccountAddr, method, action }, options);
    },
    [host, activeAccountAddr, activeContractAddr, accessSource, options],
  );

  const accountRecordSource = useMemo<AccountRecordSource>(() => {
    const base = createAccountRecordSource({ rpcUrl: host.rpcUrl, accessSource, readMode: host.readMode }, options);
    const read = host.readAccountRecord;
    if (!read) return base;
    return { ...base, fetch: async ({ accountKey }) => ({ accountRecord: await read(accountKey), updatedAt: Date.now() }) };
  }, [host, accessSource, options]);

  const {
    tradingAmountDisplay,
    stakedAmountDisplay,
    pendingTotalAmountDisplay,
    totalCoinsDisplay,
    tradingOrStakedLoading,
    tradingIsZero,
    stakedIsZero,
    pendingIsZero,
    pendingInitialLoading,
    pendingRoleUnavailable,
    totalReward,
    rewardRows,
    runTotalRewardAction,
    runRewardAction,
    runAvailableRoleRewardEstimates,
    refreshAccountRecord,
  } = useManageSponsorshipsData({
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

  if (!isActive) return null;
  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
      <ManageSponsorshipsPanel
        tradingAmountText={tradingAmountDisplay}
        stakedAmountText={stakedAmountDisplay}
        pendingAmountText={pendingTotalAmountDisplay}
        totalCoinsText={totalCoinsDisplay}
        tradingOrStalledLoading={tradingOrStakedLoading}
        tradingIsZero={tradingIsZero}
        onStake={goToSponsorStakeTab}
        onUnstake={unstakeAllSponsorships}
        // The web opens a role-account list here (ACTIVE_SPONSORSHIPS); without the web's list host that mode has nothing to draw and left the body blank. The accounts you
        // sponsor are the Un-Stake list's rows, so the label opens that list.
        onStakedLabelClick={unstakeAllSponsorships}
        stakedIsZero={stakedIsZero}
        autoRefresh={autoRefresh}
        onAutoRefreshChange={changeAutoRefresh}
        pendingVisible={pendingVisible}
        pendingInitialLoading={pendingInitialLoading}
        pendingRoleUnavailable={pendingRoleUnavailable}
        pendingIsZero={pendingIsZero}
        pendingClaimInProgress={totalReward.loading && totalReward.action === 'claim'}
        pendingClaimDisabled={!pendingInitialLoading && ((totalReward.loading && totalReward.action === 'claim') || !activeContractAddr || !activeAccountAddr)}
        pendingErrorText={totalReward.error}
        onPendingEstimate={() => {
          if (!pendingRoleUnavailable) void runTotalRewardAction('estimate');
        }}
        onPendingClaim={() => void runTotalRewardAction('claim')}
        onOpenPendingGroup={onOpenRewardsByAccountType}
        onPendingHeaderEstimate={() => void runAvailableRoleRewardEstimates()}
        onClosePendingGroup={onCloseRewardsByAccountType}
        rewardRows={rewardRows}
        onRoleEstimate={(role) => void runRewardAction(role, 'estimate')}
        onRoleClaim={(role) => void runRewardAction(role, 'claim')}
        addressSelectContent={extras.addressSelectContent}
      />
    </div>
  );
}
