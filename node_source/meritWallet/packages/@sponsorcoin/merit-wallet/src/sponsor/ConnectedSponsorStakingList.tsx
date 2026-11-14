// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/sponsor/ConnectedSponsorStakingList.tsx
//
// 2026-10-09 -- the "Sponsored Recipient Accounts" list with Un-Stake, written once for both hosts. The card is spcoin-panels' SponsorStakingListPanel and the
// confirm popup is its StakeConfirmPopup (REVOKE), the same pieces the web app's components/views/RadioOverlayPanels/SponsorStakingListPanel.tsx composes.
// What that wrapper took from web-only modules is supplied by the host through SponsorStakingHost: contract reads (the extension reads the chain directly),
// one function that sends an unstake transaction and waits for it to be mined, and account profiles for the rows. The Un-Stake walk itself is unstakeWalk.ts.
'use client';

import { panelPartClass } from '@sponsorcoin/spcoin-common/styles';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import { loadRoleSponsorTree, loadSponsorTree, type ChainRead, type TreeRecipient } from './sponsorReads';
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
  claim?(method: string, accountKey: string): Promise<unknown>;
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
      const rows = await Promise.all(tree.map(async (node) => account(await profileOf(node.recipientKey))));
      if (mine !== generation.current) return;
      setRecipients(rows);
      const info: Record<string, RecipientStakeInfo[]> = {};
      await Promise.all(
        tree.map(async (node, nodeIndex) => {
          // 2026-11-12 (owner: "why do we have a lot of Loading"): the table looks a row's stake up by the ROW's own address (the profile's, in the registry's one lower-case form), but this map was keyed by the
          // chain's checksummed address. They are equal only when the address has no upper-case letters, so every recipient like 0x…000A (upper-case A) never found its stake and stayed "Loading…" for ever.
          // The map is keyed by the row's address, in the same order as `rows` (Promise.all keeps it).
          const rowKey = String(rows[nodeIndex]?.address ?? '').trim() || node.recipientKey;
          info[rowKey] = await Promise.all(
            node.rates.map(async (rate): Promise<RecipientStakeInfo> => {
              const agentAccounts: AgentStakeInfo[] = await Promise.all(
                rate.agents.map(async (agent) => {
                  const total = agent.rates.reduce((sum, r) => {
                    try {
                      return sum + BigInt(r.stakedSPCoins || '0');
                    } catch {
                      return sum;
                    }
                  }, 0n);
                  return {
                    account: account(await profileOf(agent.agentKey)),
                    stakedSPCoins: total.toString(),
                    agentRates: agent.rates.map((r) => ({ agentRateKey: r.agentRateKey, stakedSPCoins: r.stakedSPCoins })),
                  };
                }),
              );
              return { rateKey: rate.recipientRateKey, stakedSPCoins: rate.stakedSPCoins, agentAccounts };
            }),
          );
        }),
      );
      if (mine !== generation.current) return;
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
  const handleClaim = useCallback(async () => {
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
      const sent = await host.claim('claimOnChain' + listMode.role + 'Rewards', sponsor);
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
      firstColumnLabel={listMode.kind === 'claim' && listMode.role !== 'Sponsor' ? 'Sponsor' : undefined}
      onClaimRewards={handleClaim}
    />
  );
}
