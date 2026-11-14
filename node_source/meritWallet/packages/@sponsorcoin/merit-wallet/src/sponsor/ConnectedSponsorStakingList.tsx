// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/sponsor/ConnectedSponsorStakingList.tsx
//
// 2026-10-09 -- the "Sponsored Recipient Accounts" list with Un-Stake, written once for both hosts. The card is spcoin-panels' SponsorStakingListPanel and the
// confirm popup is its StakeConfirmPopup (REVOKE), the same pieces the web app's components/views/RadioOverlayPanels/SponsorStakingListPanel.tsx composes.
// What that wrapper took from web-only modules is supplied by the host through SponsorStakingHost: contract reads (the extension reads the chain directly),
// one function that sends an unstake transaction and waits for it to be mined, and account profiles for the rows. The Un-Stake walk itself is unstakeWalk.ts.
'use client';

import { panelPartClass } from '@sponsorcoin/spcoin-common/styles';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { parseUnits } from 'viem';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import type { TokenContract, spCoinAccount } from '@sponsorcoin/spcoin-common/context';
import { STATUS } from '@sponsorcoin/spcoin-common/context';
import { useExchangeContext, usePanelTree, usePanelVisible } from '@sponsorcoin/spcoin-exchange-engine';
import {
  SponsorStakingListPanel,
  StakeConfirmPopup,
  type AgentStakeInfo,
  type RecipientStakeInfo,
  type UnstakeTarget,
  formatTokenAmount,
} from '@sponsorcoin/spcoin-panels';
import { AccountAvatarWithOpen, AccountSelectDropDownHosted, ACCOUNT_SELECT_DISPLAY, LoadingText, type SponsorStakingAccountCellSlot } from '@sponsorcoin/spcoin-panels';
import { buildClaimReceipt, buildUnstakeReceipt, toMessageAccount, type ClaimReceiptRow, type ReceiptProfile } from '../receipt/transactionReceipts';
import { useTransactionReceipt } from '../receipt/useTransactionReceipt';
import { useActiveAccountProfile } from '../swap/activeAccountProfile';
import { loadRoleSponsorTree, loadSponsorTree, throttleRead, type ChainRead, type TreeRecipient } from './sponsorReads';
import { addPendingToTree } from '../rewards/estimateRewards';
import { assetListRowClass, listStyle } from '@sponsorcoin/spcoin-common/styles';
import { unstakeSpCoin, type UnstakeSend } from './unstakeWalk';
import { useStakingListMode } from './stakingListMode';

// The row's account pill and avatar are the same in every app (they were the web app's slots).
const ROW_ACCOUNT_SELECT_DISPLAY = ACCOUNT_SELECT_DISPLAY.ICON | ACCOUNT_SELECT_DISPLAY.NAME | ACCOUNT_SELECT_DISPLAY.ADDRESS | ACCOUNT_SELECT_DISPLAY.COPY;
const ROW_ACCOUNT_CELL: SponsorStakingAccountCellSlot = ({ account, mode, label, addrPrePostSize, addressSizeClassName, onAddressClick }) => (
  <AccountSelectDropDownHosted
    recipientAccount={account}
    mode={mode}
    label={label}
    showDisplay={ROW_ACCOUNT_SELECT_DISPLAY}
    onSelectClick={(e) => e.preventDefault()}
    onAddressClick={onAddressClick}
    addrPrePostSize={addrPrePostSize}
    addressSizeClassName={addressSizeClassName}
    panelGateId={null}
    // 2026-11-07 (owner): the same scale as the account list's rows and the header's dropdown (list icon, name, pill and glyph sizes)
    iconSizeClassName={assetListRowClass.iconSizeClassName_assetSelectDropDown}
    pillHeightClassName={assetListRowClass.pillHeightClassName_assetSelectDropDown}
    pillFontClassName={assetListRowClass.pillFontClassName_assetSelectDropDown}
    nameLineClassName={assetListRowClass.nameLineClassName_assetSelectDropDown}
    chevronSize={listStyle.glyphPx}
    copyIconSize={listStyle.glyphPx}
  />
);
const ROW_AVATAR = (account: spCoinAccount) => <AccountAvatarWithOpen account={account} mode={SP_COIN_DISPLAY.RECIPIENT_ACCOUNT} className={panelPartClass.rowAvatar} />;

export interface SponsorStakingHost {
  /** The active spCoin contract. */
  contractAddress(): string;
  decimals?: number;
  /** Contract views (the extension answers them straight from the chain's RPC). */
  read: ChainRead;
  /** Send one unstake transaction and resolve when it is mined; throw a readable message on rejection or failure. */
  send: UnstakeSend;
  /** Name, symbol and avatar for an address (the rows show them). */
  loadProfile(address: string): Promise<ReceiptProfile>;
  /** The active spCoin token, for the confirm popup's picture. */
  spCoinContract?: TokenContract;
  /** Load the whole staking tree in one go when the host has a faster way than the many small reads (the web app asks its server once). Default: loadSponsorTree over `read`. */
  loadTree?(sponsor: string): Promise<TreeRecipient[]>;
  /** Called once before an unstake walk starts, so the host can obtain its signer once for all the legs (one approval prompt for the whole walk, as the web app's unstake always did). Throw to stop. */
  prepare?(): Promise<void> | void;
  /** Claim mode: send the contract's claim for the sponsor (method e.g. claimOnChainSponsorRewards) signed by the active account, and resolve when mined; throw a readable message on failure. Omit: the list cannot claim. */
  claim?(method: string, accountKey: string, ...args: string[]): Promise<unknown>;
  /** The shared Auto Refresh store (the Rewards page's check box), so the Claim list's check box is the same switch. Omit: the list keeps its own switch. */
  autoRefreshStore?: { subscribe(listener: () => void): () => void; getSnapshot(): boolean; getServerSnapshot(): boolean; setUserPreference(next: boolean): void };
  /** Direct contract views (named key / value arguments) for the Claim list's per-row rewards, which need the reward clocks (getRateTransactionSet and the set-key builders) that the web's run-script reads do not offer. Default: `read`. */
  readDirect?: ChainRead;
  /** The spCoin balance of an account, raw base units (undefined when it cannot be read). Claim mode reads every involved account before and after the claim to show who received what. */
  readBalance?(accountAddress: string): Promise<bigint | undefined>;
  /** A hook that registers the list's reload function with the host's refresh bus (the web's useCacheRefreshHandler); must be a stable function. */
  useRegisterRefresh?: (refresh: () => void | Promise<void>, active: boolean) => void;
  /** Called after an unstake finished (any outcome) with the recipients it touched, so the host can reload balances and drop its caches. */
  onChanged?(info: { sponsor: string; recipients: string[] }): void;
}

// The last list seen per (contract, sponsor): reopening the panel paints it at once and then refreshes (the web app's list cache did the same).
const snapshots = new Map<string, { recipients: spCoinAccount[]; stakeInfoByAddress: Record<string, RecipientStakeInfo[] | undefined> }>();

function account(profile: ReceiptProfile): spCoinAccount {
  return toMessageAccount(profile)!;
}

const noopRegisterRefresh = () => undefined;
const noopSubscribe = () => () => undefined;

export default function ConnectedSponsorStakingList({ host }: { host: SponsorStakingHost }) {
  const useRegisterRefresh = host.useRegisterRefresh ?? noopRegisterRefresh;
  const { exchangeContext, setErrorMessage } = useExchangeContext();
  const { openPanel } = usePanelTree();
  const isVisible = usePanelVisible(SP_COIN_DISPLAY.SPONSOR_STAKING_LIST);
  const showReceipt = useTransactionReceipt();
  const activeProfile = useActiveAccountProfile();
  const sponsor = String(exchangeContext?.apiCoreSyncedMembers?.accounts?.activeAccount?.address ?? '').trim();
  const decimals = host.decimals ?? 18;
  const listMode = useStakingListMode();

  const [recipients, setRecipients] = useState<spCoinAccount[]>([]);
  const [stakeInfoByAddress, setStakeInfoByAddress] = useState<Record<string, RecipientStakeInfo[] | undefined>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [activeUnstakeKey, setActiveUnstakeKey] = useState<string | null>(null);
  const generation = useRef(0);
  // Auto Refresh (Claim lists): the same switch as the Rewards page when the host shares its store
  const store = host.autoRefreshStore;
  const [localAutoRefresh, setLocalAutoRefresh] = useState(false);
  const sharedAutoRefresh = useSyncExternalStore(store?.subscribe ?? noopSubscribe, store?.getSnapshot ?? (() => false), store?.getServerSnapshot ?? (() => false));
  const autoRefresh = store ? sharedAutoRefresh : localAutoRefresh;
  const changeAutoRefresh = useCallback(
    (next: boolean) => {
      if (store) store.setUserPreference(next);
      else setLocalAutoRefresh(next);
    },
    [store],
  );
  // Recomputes the rewards for "now" from what the last read found and redraws (no new reads); set by fetchList in Claim lists
  const tickRef = useRef<(() => void) | undefined>(undefined);

  const fetchList = useCallback(async () => {
    if (!sponsor) return;
    const mine = ++generation.current;
    const claimRole = listMode.kind === 'claim' && listMode.role !== 'Sponsor' ? listMode.role : undefined;
    const cacheKey = `${host.contractAddress().toLowerCase()}:${sponsor.toLowerCase()}:${claimRole ?? 'sponsor'}`;
    const cached = snapshots.get(cacheKey);
    if (cached) {
      setRecipients(cached.recipients);
      setStakeInfoByAddress(cached.stakeInfoByAddress);
    }
    setLoading(!cached);
    setError(undefined);
    try {
      // Sponsor / Unstake: the account's own sponsorships. Recipient / Agent Claim: the sponsors of the account, in the same shape.
      const tree = (await (claimRole ? loadRoleSponsorTree(claimRole, sponsor, host.read) : host.loadTree ? host.loadTree(sponsor) : loadSponsorTree(sponsor, host.read))).filter((node) => node.recipientKey);
      const profiles = new Map<string, Promise<ReceiptProfile>>();
      const profileOf = (address: string) => {
        const key = address.toLowerCase();
        if (!profiles.has(key)) profiles.set(key, host.loadProfile(address).catch(() => ({ address })));
        return profiles.get(key)!;
      };
      // Claim lists show the reward each row has earned beside its stake. A failed read just leaves the rows without it (the staked amounts still show).
      let recompute: ((at?: number | bigint) => void) | undefined;
      if (listMode.kind === 'claim' && listMode.role !== 'Agent') {
        try {
          recompute = await addPendingToTree(listMode.role, sponsor, tree, throttleRead(host.readDirect ?? host.read));
        } catch {
          // staked amounts only
        }
      }
      const rows = await Promise.all(tree.map(async (node) => account(await profileOf(node.recipientKey))));
      if (mine !== generation.current) return;
      setRecipients(rows);
      // Every agent's profile first, so the panel's data can be rebuilt synchronously (Auto Refresh redraws it every second).
      const agentProfiles = new Map<string, ReceiptProfile>();
      await Promise.all(
        Array.from(new Set(tree.flatMap((node) => node.rates.flatMap((rate) => rate.agents.map((agent) => agent.agentKey))))).map(async (agentKey) => {
          agentProfiles.set(agentKey.toLowerCase(), await profileOf(agentKey));
        }),
      );
      const buildInfo = (): Record<string, RecipientStakeInfo[]> => {
        const out: Record<string, RecipientStakeInfo[]> = {};
        tree.forEach((node, nodeIndex) => {
          // 2026-11-12 (owner: "why do we have a lot of Loading"): the table looks a row's stake up by the ROW's own address (the profile's, in the registry's one lower-case form), but this map was keyed by the
          // chain's checksummed address. They are equal only when the address has no upper-case letters, so every recipient like 0x…000A (upper-case A) never found its stake and stayed "Loading…" for ever.
          // The map is keyed by the row's address, in the same order as `rows`.
          const rowKey = String(rows[nodeIndex]?.address ?? '').trim() || node.recipientKey;
          out[rowKey] = node.rates.map((rate): RecipientStakeInfo => {
            const agentAccounts: AgentStakeInfo[] = rate.agents.map((agent) => {
              const total = agent.rates.reduce((sum, r) => {
                try {
                  return sum + BigInt(r.stakedSPCoins || '0');
                } catch {
                  return sum;
                }
              }, 0n);
              const leafPending = agent.rates.map((r) => r.pending);
              const agentPending = leafPending.every((v) => v !== undefined) ? leafPending.reduce<bigint>((sum, v) => sum + BigInt(v as string), 0n).toString() : undefined;
              return {
                account: account(agentProfiles.get(agent.agentKey.toLowerCase()) ?? { address: agent.agentKey }),
                stakedSPCoins: total.toString(),
                pendingSPCoins: agentPending,
                agentRates: agent.rates.map((r) => ({ agentRateKey: r.agentRateKey, stakedSPCoins: r.stakedSPCoins, pendingSPCoins: r.pending })),
              };
            });
            const pendingTotal =
              rate.pendingDirect !== undefined && agentAccounts.every((a) => a.pendingSPCoins !== undefined)
                ? agentAccounts.reduce<bigint>((sum, a) => sum + BigInt(a.pendingSPCoins as string), BigInt(rate.pendingDirect)).toString()
                : undefined;
            return { rateKey: rate.recipientRateKey, stakedSPCoins: rate.stakedSPCoins, agentAccounts, pendingDirect: rate.pendingDirect, pendingTotal };
          });
        });
        return out;
      };
      const info = buildInfo();
      if (mine !== generation.current) return;
      tickRef.current = recompute
        ? () => {
            recompute?.();
            setStakeInfoByAddress(buildInfo());
          }
        : undefined;
      setStakeInfoByAddress(info);
      snapshots.set(cacheKey, { recipients: rows, stakeInfoByAddress: info });
    } catch (err) {
      if (mine === generation.current) {
        const text = String((err as Error)?.message ?? err);
        // 2026-11-07 (owner: an RPC failure belongs on the Error page of MESSAGE_PANEL, not as raw text inside the table): the table keeps one short line, the full message is the panel's
        setError('The recipient list could not be loaded.');
        setErrorMessage({ errCode: 0, msg: text, source: 'SponsorStakingList', status: STATUS.MESSAGE_ERROR, reason: 'The recipient list could not be loaded.' });
        openPanel(SP_COIN_DISPLAY.MESSAGE_PANEL, 'SponsorStakingList:loadFailed');
      }
    } finally {
      if (mine === generation.current) setLoading(false);
    }
  }, [sponsor, host, listMode]);

  useEffect(() => {
    if (!isVisible || !sponsor) {
      setRecipients([]);
      setStakeInfoByAddress({});
      setError(undefined);
      return;
    }
    void fetchList();
  }, [isVisible, sponsor, fetchList]);

  useRegisterRefresh(fetchList, isVisible);

  // Auto Refresh (Claim lists): the rewards tick every second from the clocks already read, and the list itself is read again every 20 s (stakes and clocks can change)
  useEffect(() => {
    if (!autoRefresh || listMode.kind !== 'claim' || !isVisible) return undefined;
    const tick = setInterval(() => tickRef.current?.(), 1000);
    const resync = setInterval(() => void fetchList(), 20000);
    return () => {
      clearInterval(tick);
      clearInterval(resync);
    };
  }, [autoRefresh, listMode.kind, isVisible, fetchList]);

  const handleConfirmUnstake = useCallback(
    async (target: UnstakeTarget, amount?: string) => {
      const { recipient, rateKey, agent, agentRateKey, amount: targetAmount } = target;
      setActiveUnstakeKey([String(recipient?.address ?? '').trim(), rateKey ?? '', agent ? String(agent.address ?? '').trim() : '', agentRateKey ?? ''].join('|').toLowerCase());
      try {
        await host.prepare?.();
        const qty = amount !== undefined && amount !== targetAmount ? parseUnits(amount, decimals) : undefined;
        const result = await unstakeSpCoin(
          { read: host.read, send: host.send },
          sponsor,
          recipient ? String(recipient.address ?? '').trim() : undefined,
          rateKey,
          agent ? String(agent.address ?? '').trim() : undefined,
          agentRateKey,
          qty,
        );
        const profile = (a: spCoinAccount | undefined): ReceiptProfile | undefined => (a ? { address: a.address, name: a.name, symbol: a.symbol, logoURL: a.logoURL } : undefined);
        const sponsorAccount = exchangeContext?.apiCoreSyncedMembers?.accounts?.activeAccount;
        showReceipt(
          buildUnstakeReceipt({
            status: result.status,
            legs: result.legs,
            legCount: result.legCount,
            unstakedAmount: formatTokenAmount(result.totalUnstakedRaw.toString(), decimals),
            // The header's profile (name, symbol, avatar) when it is this account; the context's record otherwise.
            sponsor:
              activeProfile?.address && activeProfile.address.toLowerCase() === sponsor.toLowerCase()
                ? activeProfile
                : sponsorAccount
                  ? { address: sponsorAccount.address, name: sponsorAccount.name, symbol: sponsorAccount.symbol, logoURL: sponsorAccount.logoURL }
                  : { address: sponsor },
            recipient: profile(recipient),
            agent: profile(agent),
            rateKey,
          }),
          'ConnectedSponsorStakingList:unstake',
        );
        host.onChanged?.({ sponsor, recipients: Array.from(new Set(result.legs.map((leg) => leg.recipient))) });
        void fetchList();
      } catch (err) {
        showReceipt(
          buildUnstakeReceipt({ status: 'failed', legs: [{ txHash: '', gasUsed: 0n, status: 'failed', error: String((err as Error)?.message ?? err) }], legCount: 1, unstakedAmount: '0' }),
          'ConnectedSponsorStakingList:unstake:error',
        );
      } finally {
        setActiveUnstakeKey(null);
      }
    },
    [host, sponsor, decimals, exchangeContext, activeProfile, showReceipt, fetchList],
  );

  // Claim mode: any button claims everything the account has earned (the contract has no claim for one row); the Total row's button shows the busy state.
  // The completion card lists who received what: every involved account's spCoin balance is read before and after, and the difference is shown.
  const handleClaim = useCallback(async (target?: UnstakeTarget) => {
    if (listMode.kind !== 'claim') return;
    setActiveUnstakeKey('|||');
    try {
      if (!host.claim) throw new Error('This wallet cannot send the claim from here yet.');
      const profileOf = (a: spCoinAccount | undefined): ReceiptProfile | undefined => (a ? { address: a.address, name: a.name, symbol: a.symbol, logoURL: a.logoURL } : undefined);
      const sponsorAccount = exchangeContext?.apiCoreSyncedMembers?.accounts?.activeAccount;
      const mine: ReceiptProfile = activeProfile?.address && activeProfile.address.toLowerCase() === sponsor.toLowerCase() ? activeProfile : sponsorAccount ? { address: sponsorAccount.address, name: sponsorAccount.name, symbol: sponsorAccount.symbol, logoURL: sponsorAccount.logoURL } : { address: sponsor };
      // The accounts a claim can pay: this account in its own role, the list's rows in the opposite role, and the agents under the rows.
      const involved = new Map<string, { role: ClaimReceiptRow['role']; profile: ReceiptProfile | undefined }>();
      const add = (role: ClaimReceiptRow['role'], profile: ReceiptProfile | undefined) => {
        const address = String(profile?.address ?? '').trim();
        if (address && !involved.has(role + address.toLowerCase())) involved.set(role + address.toLowerCase(), { role, profile });
      };
      const own: ClaimReceiptRow['role'] = listMode.role === 'Sponsor' ? 'SPONSOR' : listMode.role === 'Recipient' ? 'RECIPIENT' : 'AGENT';
      const rowRole: ClaimReceiptRow['role'] = listMode.role === 'Sponsor' ? 'RECIPIENT' : 'SPONSOR';
      add(own, mine);
      for (const row of recipients) {
        add(rowRole, profileOf(row));
        for (const bucket of stakeInfoByAddress[String(row.address ?? '').trim()] ?? []) for (const agent of bucket.agentAccounts) add('AGENT', profileOf(agent.account));
      }
      const entries = [...involved.values()];
      const readAll = () => Promise.all(entries.map((entry) => (host.readBalance ? host.readBalance(String(entry.profile?.address)).catch(() => undefined) : Promise.resolve(undefined))));
      const before = await readAll();
      // Which contract claim: the Total row (no target) claims the whole account for this role. A row claims just that row: the contract settles one recipient, one rate bucket or one agent of a sponsor (and pays every party the bucket touches).
      // Sponsor list: the rows are the account's recipients. Recipient list: the rows are the sponsors of the account. (Agent list rows still claim the whole account: one agent row spans several recipients.)
      const rowAddress = String(target?.recipient?.address ?? '').trim();
      const agentAddress = String(target?.agent?.address ?? '').trim();
      let method = 'claimOnChain' + listMode.role + 'Rewards';
      let args: string[] = [];
      let who = sponsor;
      if (target && rowAddress && listMode.role !== 'Agent') {
        who = listMode.role === 'Recipient' ? rowAddress : sponsor;
        const recipientKey = listMode.role === 'Recipient' ? sponsor : rowAddress;
        if (target.rateKey && agentAddress) { method = 'claimOnChainSponsorRewardsForAgent'; args = [recipientKey, target.rateKey, agentAddress]; }
        else if (target.rateKey) { method = 'claimOnChainSponsorRewardsForRecipientRate'; args = [recipientKey, target.rateKey]; }
        else { method = 'claimOnChainSponsorRewardsForRecipient'; args = [recipientKey]; }
      }
      const sent = await host.claim(method, who, ...args);
      const after = await readAll();
      const rows: ClaimReceiptRow[] = [];
      let total = 0n;
      entries.forEach((entry, index) => {
        const was = before[index];
        const now = after[index];
        if (was === undefined || now === undefined || now <= was) return;
        total += now - was;
        rows.push({ role: entry.role, profile: entry.profile, amount: formatTokenAmount((now - was).toString(), decimals) });
      });
      const order = { SPONSOR: 0, RECIPIENT: 1, AGENT: 2 } as const;
      rows.sort((x, y) => order[x.role] - order[y.role]);
      const txHash = sent && typeof sent === 'object' && 'txHash' in sent ? String((sent as { txHash: unknown }).txHash) : undefined;
      showReceipt(buildClaimReceipt({ roleLabel: listMode.role, rows, total: formatTokenAmount(total.toString(), decimals), txHash }), 'ConnectedSponsorStakingList:claim');
      host.onChanged?.({ sponsor, recipients: [] });
      void fetchList();
    } catch (err) {
      const text = String((err as Error)?.message ?? err);
      setErrorMessage({ errCode: 0, msg: text, source: 'SponsorStakingList', status: STATUS.MESSAGE_ERROR, reason: 'The claim failed.' });
      openPanel(SP_COIN_DISPLAY.MESSAGE_PANEL, 'SponsorStakingList:claimFailed');
    } finally {
      setActiveUnstakeKey(null);
    }
  }, [listMode, host, sponsor, fetchList, setErrorMessage, openPanel, recipients, stakeInfoByAddress, exchangeContext, activeProfile, decimals, showReceipt]);

  const activeAccount = exchangeContext?.apiCoreSyncedMembers?.accounts?.activeAccount;

  return (
    <SponsorStakingListPanel
      recipients={recipients}
      stakeInfoByAddress={stakeInfoByAddress}
      decimals={decimals}
      loading={loading}
      error={error}
      activeUnstakeKey={activeUnstakeKey}
      accountCellSlot={ROW_ACCOUNT_CELL}
      avatarSlot={ROW_AVATAR}
      loadingContent={<LoadingText />}
      confirmPopupContent={({ isOpen, target, totalAmount, onConfirm, onCancel }) => (
        <StakeConfirmPopup
          isOpen={isOpen}
          mode="REVOKE"
          isSpCoin
          spCoinContract={host.spCoinContract}
          activeAccount={activeAccount}
          recipientAccount={target?.recipient}
          agentAccount={target?.agent}
          hasAgent={Boolean(target?.agent)}
          totalAmount={totalAmount}
          onCancel={onCancel}
          onConfirm={onConfirm}
        />
      )}
      onConfirmUnstake={handleConfirmUnstake}
      mode={listMode.kind}
      autoRefresh={listMode.kind === 'claim' ? autoRefresh : undefined}
      onAutoRefreshChange={changeAutoRefresh}
      firstColumnLabel={listMode.kind === 'claim' && listMode.role !== 'Sponsor' ? 'Sponsor' : undefined}
      onClaimRewards={handleClaim}
    />
  );
}
