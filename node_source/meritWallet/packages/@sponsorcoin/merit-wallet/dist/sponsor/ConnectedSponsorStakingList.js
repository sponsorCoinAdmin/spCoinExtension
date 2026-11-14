// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/sponsor/ConnectedSponsorStakingList.tsx
//
// 2026-10-09 -- the "Sponsored Recipient Accounts" list with Un-Stake, written once for both hosts. The card is spcoin-panels' SponsorStakingListPanel and the
// confirm popup is its StakeConfirmPopup (REVOKE), the same pieces the web app's components/views/RadioOverlayPanels/SponsorStakingListPanel.tsx composes.
// What that wrapper took from web-only modules is supplied by the host through SponsorStakingHost: contract reads (the extension reads the chain directly),
// one function that sends an unstake transaction and waits for it to be mined, and account profiles for the rows. The Un-Stake walk itself is unstakeWalk.ts.
'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { panelPartClass } from '@sponsorcoin/spcoin-common/styles';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { parseUnits } from 'viem';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { STATUS } from '@sponsorcoin/spcoin-common/context';
import { useExchangeContext, usePanelTree, usePanelVisible } from '@sponsorcoin/spcoin-exchange-engine';
import { SponsorStakingListPanel, StakeConfirmPopup, formatTokenAmount, } from '@sponsorcoin/spcoin-panels';
import { AccountAvatarWithOpen, AccountSelectDropDownHosted, ACCOUNT_SELECT_DISPLAY, LoadingText } from '@sponsorcoin/spcoin-panels';
import { buildClaimReceipt, buildUnstakeReceipt, toMessageAccount } from '../receipt/transactionReceipts';
import { useTransactionReceipt } from '../receipt/useTransactionReceipt';
import { useActiveAccountProfile } from '../swap/activeAccountProfile';
import { loadRoleSponsorTree, loadSponsorTree, throttleRead } from './sponsorReads';
import { addPendingToTree } from '../rewards/estimateRewards';
import { assetListRowClass, listStyle } from '@sponsorcoin/spcoin-common/styles';
import { unstakeSpCoin } from './unstakeWalk';
import { useStakingListMode } from './stakingListMode';
// The row's account pill and avatar are the same in every app (they were the web app's slots).
const ROW_ACCOUNT_SELECT_DISPLAY = ACCOUNT_SELECT_DISPLAY.ICON | ACCOUNT_SELECT_DISPLAY.NAME | ACCOUNT_SELECT_DISPLAY.ADDRESS | ACCOUNT_SELECT_DISPLAY.COPY;
const ROW_ACCOUNT_CELL = ({ account, mode, label, addrPrePostSize, addressSizeClassName, onAddressClick }) => (_jsx(AccountSelectDropDownHosted, { recipientAccount: account, mode: mode, label: label, showDisplay: ROW_ACCOUNT_SELECT_DISPLAY, onSelectClick: (e) => e.preventDefault(), onAddressClick: onAddressClick, addrPrePostSize: addrPrePostSize, addressSizeClassName: addressSizeClassName, panelGateId: null, 
    // 2026-11-07 (owner): the same scale as the account list's rows and the header's dropdown (list icon, name, pill and glyph sizes)
    iconSizeClassName: assetListRowClass.iconSizeClassName_assetSelectDropDown, pillHeightClassName: assetListRowClass.pillHeightClassName_assetSelectDropDown, pillFontClassName: assetListRowClass.pillFontClassName_assetSelectDropDown, nameLineClassName: assetListRowClass.nameLineClassName_assetSelectDropDown, chevronSize: listStyle.glyphPx, copyIconSize: listStyle.glyphPx }));
const ROW_AVATAR = (account) => _jsx(AccountAvatarWithOpen, { account: account, mode: SP_COIN_DISPLAY.RECIPIENT_ACCOUNT, className: panelPartClass.rowAvatar });
// The last list seen per (contract, sponsor): reopening the panel paints it at once and then refreshes (the web app's list cache did the same).
const snapshots = new Map();
function account(profile) {
    return toMessageAccount(profile);
}
const noopRegisterRefresh = () => undefined;
const noopSubscribe = () => () => undefined;
export default function ConnectedSponsorStakingList({ host }) {
    const useRegisterRefresh = host.useRegisterRefresh ?? noopRegisterRefresh;
    const { exchangeContext, setErrorMessage } = useExchangeContext();
    const { openPanel } = usePanelTree();
    const isVisible = usePanelVisible(SP_COIN_DISPLAY.SPONSOR_STAKING_LIST);
    const showReceipt = useTransactionReceipt();
    const activeProfile = useActiveAccountProfile();
    const sponsor = String(exchangeContext?.apiCoreSyncedMembers?.accounts?.activeAccount?.address ?? '').trim();
    const decimals = host.decimals ?? 18;
    const listMode = useStakingListMode();
    const [recipients, setRecipients] = useState([]);
    const [stakeInfoByAddress, setStakeInfoByAddress] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(undefined);
    const [activeUnstakeKey, setActiveUnstakeKey] = useState(null);
    const generation = useRef(0);
    // Auto Refresh (Claim lists): the same switch as the Rewards page when the host shares its store
    const store = host.autoRefreshStore;
    const [localAutoRefresh, setLocalAutoRefresh] = useState(false);
    const sharedAutoRefresh = useSyncExternalStore(store?.subscribe ?? noopSubscribe, store?.getSnapshot ?? (() => false), store?.getServerSnapshot ?? (() => false));
    const autoRefresh = store ? sharedAutoRefresh : localAutoRefresh;
    const changeAutoRefresh = useCallback((next) => {
        if (store)
            store.setUserPreference(next);
        else
            setLocalAutoRefresh(next);
    }, [store]);
    // Recomputes the rewards for "now" from what the last read found and redraws (no new reads); set by fetchList in Claim lists
    const tickRef = useRef(undefined);
    const fetchList = useCallback(async () => {
        if (!sponsor)
            return;
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
            const profiles = new Map();
            const profileOf = (address) => {
                const key = address.toLowerCase();
                if (!profiles.has(key))
                    profiles.set(key, host.loadProfile(address).catch(() => ({ address })));
                return profiles.get(key);
            };
            // Claim lists show the reward each row has earned beside its stake. A failed read just leaves the rows without it (the staked amounts still show).
            let recompute;
            if (listMode.kind === 'claim' && listMode.role !== 'Agent') {
                try {
                    recompute = await addPendingToTree(listMode.role, sponsor, tree, throttleRead(host.readDirect ?? host.read));
                }
                catch {
                    // staked amounts only
                }
            }
            const rows = await Promise.all(tree.map(async (node) => account(await profileOf(node.recipientKey))));
            if (mine !== generation.current)
                return;
            setRecipients(rows);
            // Every agent's profile first, so the panel's data can be rebuilt synchronously (Auto Refresh redraws it every second).
            const agentProfiles = new Map();
            await Promise.all(Array.from(new Set(tree.flatMap((node) => node.rates.flatMap((rate) => rate.agents.map((agent) => agent.agentKey))))).map(async (agentKey) => {
                agentProfiles.set(agentKey.toLowerCase(), await profileOf(agentKey));
            }));
            const buildInfo = () => {
                const out = {};
                tree.forEach((node, nodeIndex) => {
                    // 2026-11-12 (owner: "why do we have a lot of Loading"): the table looks a row's stake up by the ROW's own address (the profile's, in the registry's one lower-case form), but this map was keyed by the
                    // chain's checksummed address. They are equal only when the address has no upper-case letters, so every recipient like 0x…000A (upper-case A) never found its stake and stayed "Loading…" for ever.
                    // The map is keyed by the row's address, in the same order as `rows`.
                    const rowKey = String(rows[nodeIndex]?.address ?? '').trim() || node.recipientKey;
                    out[rowKey] = node.rates.map((rate) => {
                        const agentAccounts = rate.agents.map((agent) => {
                            const total = agent.rates.reduce((sum, r) => {
                                try {
                                    return sum + BigInt(r.stakedSPCoins || '0');
                                }
                                catch {
                                    return sum;
                                }
                            }, 0n);
                            const leafPending = agent.rates.map((r) => r.pending);
                            const agentPending = leafPending.every((v) => v !== undefined) ? leafPending.reduce((sum, v) => sum + BigInt(v), 0n).toString() : undefined;
                            return {
                                account: account(agentProfiles.get(agent.agentKey.toLowerCase()) ?? { address: agent.agentKey }),
                                stakedSPCoins: total.toString(),
                                pendingSPCoins: agentPending,
                                agentRates: agent.rates.map((r) => ({ agentRateKey: r.agentRateKey, stakedSPCoins: r.stakedSPCoins, pendingSPCoins: r.pending })),
                            };
                        });
                        const pendingTotal = rate.pendingDirect !== undefined && agentAccounts.every((a) => a.pendingSPCoins !== undefined)
                            ? agentAccounts.reduce((sum, a) => sum + BigInt(a.pendingSPCoins), BigInt(rate.pendingDirect)).toString()
                            : undefined;
                        return { rateKey: rate.recipientRateKey, stakedSPCoins: rate.stakedSPCoins, agentAccounts, pendingDirect: rate.pendingDirect, pendingTotal };
                    });
                });
                return out;
            };
            const info = buildInfo();
            if (mine !== generation.current)
                return;
            tickRef.current = recompute
                ? () => {
                    recompute?.();
                    setStakeInfoByAddress(buildInfo());
                }
                : undefined;
            setStakeInfoByAddress(info);
            snapshots.set(cacheKey, { recipients: rows, stakeInfoByAddress: info });
        }
        catch (err) {
            if (mine === generation.current) {
                const text = String(err?.message ?? err);
                // 2026-11-07 (owner: an RPC failure belongs on the Error page of MESSAGE_PANEL, not as raw text inside the table): the table keeps one short line, the full message is the panel's
                setError('The recipient list could not be loaded.');
                setErrorMessage({ errCode: 0, msg: text, source: 'SponsorStakingList', status: STATUS.MESSAGE_ERROR, reason: 'The recipient list could not be loaded.' });
                openPanel(SP_COIN_DISPLAY.MESSAGE_PANEL, 'SponsorStakingList:loadFailed');
            }
        }
        finally {
            if (mine === generation.current)
                setLoading(false);
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
        if (!autoRefresh || listMode.kind !== 'claim' || !isVisible)
            return undefined;
        const tick = setInterval(() => tickRef.current?.(), 1000);
        const resync = setInterval(() => void fetchList(), 20000);
        return () => {
            clearInterval(tick);
            clearInterval(resync);
        };
    }, [autoRefresh, listMode.kind, isVisible, fetchList]);
    const handleConfirmUnstake = useCallback(async (target, amount) => {
        const { recipient, rateKey, agent, agentRateKey, amount: targetAmount } = target;
        setActiveUnstakeKey([String(recipient?.address ?? '').trim(), rateKey ?? '', agent ? String(agent.address ?? '').trim() : '', agentRateKey ?? ''].join('|').toLowerCase());
        try {
            await host.prepare?.();
            const qty = amount !== undefined && amount !== targetAmount ? parseUnits(amount, decimals) : undefined;
            const result = await unstakeSpCoin({ read: host.read, send: host.send }, sponsor, recipient ? String(recipient.address ?? '').trim() : undefined, rateKey, agent ? String(agent.address ?? '').trim() : undefined, agentRateKey, qty);
            const profile = (a) => (a ? { address: a.address, name: a.name, symbol: a.symbol, logoURL: a.logoURL } : undefined);
            const sponsorAccount = exchangeContext?.apiCoreSyncedMembers?.accounts?.activeAccount;
            showReceipt(buildUnstakeReceipt({
                status: result.status,
                legs: result.legs,
                legCount: result.legCount,
                unstakedAmount: formatTokenAmount(result.totalUnstakedRaw.toString(), decimals),
                // The header's profile (name, symbol, avatar) when it is this account; the context's record otherwise.
                sponsor: activeProfile?.address && activeProfile.address.toLowerCase() === sponsor.toLowerCase()
                    ? activeProfile
                    : sponsorAccount
                        ? { address: sponsorAccount.address, name: sponsorAccount.name, symbol: sponsorAccount.symbol, logoURL: sponsorAccount.logoURL }
                        : { address: sponsor },
                recipient: profile(recipient),
                agent: profile(agent),
                rateKey,
            }), 'ConnectedSponsorStakingList:unstake');
            host.onChanged?.({ sponsor, recipients: Array.from(new Set(result.legs.map((leg) => leg.recipient))) });
            void fetchList();
        }
        catch (err) {
            showReceipt(buildUnstakeReceipt({ status: 'failed', legs: [{ txHash: '', gasUsed: 0n, status: 'failed', error: String(err?.message ?? err) }], legCount: 1, unstakedAmount: '0' }), 'ConnectedSponsorStakingList:unstake:error');
        }
        finally {
            setActiveUnstakeKey(null);
        }
    }, [host, sponsor, decimals, exchangeContext, activeProfile, showReceipt, fetchList]);
    // Claim mode: any button claims everything the account has earned (the contract has no claim for one row); the Total row's button shows the busy state.
    // The completion card lists who received what: every involved account's spCoin balance is read before and after, and the difference is shown.
    const handleClaim = useCallback(async (target) => {
        if (listMode.kind !== 'claim')
            return;
        setActiveUnstakeKey('|||');
        try {
            if (!host.claim)
                throw new Error('This wallet cannot send the claim from here yet.');
            const profileOf = (a) => (a ? { address: a.address, name: a.name, symbol: a.symbol, logoURL: a.logoURL } : undefined);
            const sponsorAccount = exchangeContext?.apiCoreSyncedMembers?.accounts?.activeAccount;
            const mine = activeProfile?.address && activeProfile.address.toLowerCase() === sponsor.toLowerCase() ? activeProfile : sponsorAccount ? { address: sponsorAccount.address, name: sponsorAccount.name, symbol: sponsorAccount.symbol, logoURL: sponsorAccount.logoURL } : { address: sponsor };
            // The accounts a claim can pay: this account in its own role, the list's rows in the opposite role, and the agents under the rows.
            const involved = new Map();
            const add = (role, profile) => {
                const address = String(profile?.address ?? '').trim();
                if (address && !involved.has(role + address.toLowerCase()))
                    involved.set(role + address.toLowerCase(), { role, profile });
            };
            const own = listMode.role === 'Sponsor' ? 'SPONSOR' : listMode.role === 'Recipient' ? 'RECIPIENT' : 'AGENT';
            const rowRole = listMode.role === 'Sponsor' ? 'RECIPIENT' : 'SPONSOR';
            add(own, mine);
            for (const row of recipients) {
                add(rowRole, profileOf(row));
                for (const bucket of stakeInfoByAddress[String(row.address ?? '').trim()] ?? [])
                    for (const agent of bucket.agentAccounts)
                        add('AGENT', profileOf(agent.account));
            }
            const entries = [...involved.values()];
            const readAll = () => Promise.all(entries.map((entry) => (host.readBalance ? host.readBalance(String(entry.profile?.address)).catch(() => undefined) : Promise.resolve(undefined))));
            const before = await readAll();
            // Which contract claim: the Total row (no target) claims the whole account for this role. A row claims just that row: the contract settles one recipient, one rate bucket or one agent of a sponsor (and pays every party the bucket touches).
            // Sponsor list: the rows are the account's recipients. Recipient list: the rows are the sponsors of the account. (Agent list rows still claim the whole account: one agent row spans several recipients.)
            const rowAddress = String(target?.recipient?.address ?? '').trim();
            const agentAddress = String(target?.agent?.address ?? '').trim();
            let method = 'claimOnChain' + listMode.role + 'Rewards';
            let args = [];
            let who = sponsor;
            if (target && rowAddress && listMode.role !== 'Agent') {
                who = listMode.role === 'Recipient' ? rowAddress : sponsor;
                const recipientKey = listMode.role === 'Recipient' ? sponsor : rowAddress;
                if (target.rateKey && agentAddress) {
                    method = 'claimOnChainSponsorRewardsForAgent';
                    args = [recipientKey, target.rateKey, agentAddress];
                }
                else if (target.rateKey) {
                    method = 'claimOnChainSponsorRewardsForRecipientRate';
                    args = [recipientKey, target.rateKey];
                }
                else {
                    method = 'claimOnChainSponsorRewardsForRecipient';
                    args = [recipientKey];
                }
            }
            const sent = await host.claim(method, who, ...args);
            const after = await readAll();
            const rows = [];
            let total = 0n;
            entries.forEach((entry, index) => {
                const was = before[index];
                const now = after[index];
                if (was === undefined || now === undefined || now <= was)
                    return;
                total += now - was;
                rows.push({ role: entry.role, profile: entry.profile, amount: formatTokenAmount((now - was).toString(), decimals) });
            });
            const order = { SPONSOR: 0, RECIPIENT: 1, AGENT: 2 };
            rows.sort((x, y) => order[x.role] - order[y.role]);
            const txHash = sent && typeof sent === 'object' && 'txHash' in sent ? String(sent.txHash) : undefined;
            showReceipt(buildClaimReceipt({ roleLabel: listMode.role, rows, total: formatTokenAmount(total.toString(), decimals), txHash }), 'ConnectedSponsorStakingList:claim');
            host.onChanged?.({ sponsor, recipients: [] });
            void fetchList();
        }
        catch (err) {
            const text = String(err?.message ?? err);
            setErrorMessage({ errCode: 0, msg: text, source: 'SponsorStakingList', status: STATUS.MESSAGE_ERROR, reason: 'The claim failed.' });
            openPanel(SP_COIN_DISPLAY.MESSAGE_PANEL, 'SponsorStakingList:claimFailed');
        }
        finally {
            setActiveUnstakeKey(null);
        }
    }, [listMode, host, sponsor, fetchList, setErrorMessage, openPanel, recipients, stakeInfoByAddress, exchangeContext, activeProfile, decimals, showReceipt]);
    const activeAccount = exchangeContext?.apiCoreSyncedMembers?.accounts?.activeAccount;
    return (_jsx(SponsorStakingListPanel, { recipients: recipients, stakeInfoByAddress: stakeInfoByAddress, decimals: decimals, loading: loading, error: error, activeUnstakeKey: activeUnstakeKey, accountCellSlot: ROW_ACCOUNT_CELL, avatarSlot: ROW_AVATAR, loadingContent: _jsx(LoadingText, {}), confirmPopupContent: ({ isOpen, target, totalAmount, onConfirm, onCancel }) => (_jsx(StakeConfirmPopup, { isOpen: isOpen, mode: "REVOKE", isSpCoin: true, spCoinContract: host.spCoinContract, activeAccount: activeAccount, recipientAccount: target?.recipient, agentAccount: target?.agent, hasAgent: Boolean(target?.agent), totalAmount: totalAmount, onCancel: onCancel, onConfirm: onConfirm })), onConfirmUnstake: handleConfirmUnstake, mode: listMode.kind, autoRefresh: listMode.kind === 'claim' ? autoRefresh : undefined, onAutoRefreshChange: changeAutoRefresh, firstColumnLabel: listMode.kind === 'claim' && listMode.role !== 'Sponsor' ? 'Sponsor' : undefined, onClaimRewards: handleClaim }));
}
