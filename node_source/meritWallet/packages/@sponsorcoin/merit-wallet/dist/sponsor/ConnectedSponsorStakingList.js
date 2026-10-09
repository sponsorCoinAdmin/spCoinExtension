// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/sponsor/ConnectedSponsorStakingList.tsx
//
// 2026-10-09 -- the "Sponsored Recipient Accounts" list with Un-Stake, written once for both hosts. The card is spcoin-panels' SponsorStakingListPanel and the
// confirm popup is its StakeConfirmPopup (REVOKE), the same pieces the web app's components/views/RadioOverlayPanels/SponsorStakingListPanel.tsx composes.
// What that wrapper took from web-only modules is supplied by the host through SponsorStakingHost: contract reads (the extension reads the chain directly),
// one function that sends an unstake transaction and waits for it to be mined, and account profiles for the rows. The Un-Stake walk itself is unstakeWalk.ts.
'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from 'react';
import { parseUnits } from 'viem';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { useExchangeContext, usePanelVisible } from '@sponsorcoin/spcoin-exchange-engine';
import { SponsorStakingListPanel, StakeConfirmPopup, formatTokenAmount, } from '@sponsorcoin/spcoin-panels';
import { buildUnstakeReceipt, toMessageAccount } from '../receipt/transactionReceipts';
import { useTransactionReceipt } from '../receipt/useTransactionReceipt';
import { useActiveAccountProfile } from '../swap/activeAccountProfile';
import { loadSponsorTree } from './sponsorReads';
import { unstakeSpCoin } from './unstakeWalk';
// The last list seen per (contract, sponsor): reopening the panel paints it at once and then refreshes (the web app's list cache did the same).
const snapshots = new Map();
function account(profile) {
    return toMessageAccount(profile);
}
const noopRegisterRefresh = () => undefined;
export default function ConnectedSponsorStakingList({ host }) {
    const useRegisterRefresh = host.useRegisterRefresh ?? noopRegisterRefresh;
    const { exchangeContext } = useExchangeContext();
    const isVisible = usePanelVisible(SP_COIN_DISPLAY.SPONSOR_STAKING_LIST);
    const showReceipt = useTransactionReceipt();
    const activeProfile = useActiveAccountProfile();
    const sponsor = String(exchangeContext?.apiCoreSyncedMembers?.accounts?.activeAccount?.address ?? '').trim();
    const decimals = host.decimals ?? 18;
    const [recipients, setRecipients] = useState([]);
    const [stakeInfoByAddress, setStakeInfoByAddress] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(undefined);
    const [activeUnstakeKey, setActiveUnstakeKey] = useState(null);
    const generation = useRef(0);
    const fetchList = useCallback(async () => {
        if (!sponsor)
            return;
        const mine = ++generation.current;
        const cacheKey = `${host.contractAddress().toLowerCase()}:${sponsor.toLowerCase()}`;
        const cached = snapshots.get(cacheKey);
        if (cached) {
            setRecipients(cached.recipients);
            setStakeInfoByAddress(cached.stakeInfoByAddress);
        }
        setLoading(!cached);
        setError(undefined);
        try {
            const tree = (await (host.loadTree ? host.loadTree(sponsor) : loadSponsorTree(sponsor, host.read))).filter((node) => node.recipientKey);
            const profiles = new Map();
            const profileOf = (address) => {
                const key = address.toLowerCase();
                if (!profiles.has(key))
                    profiles.set(key, host.loadProfile(address).catch(() => ({ address })));
                return profiles.get(key);
            };
            const rows = await Promise.all(tree.map(async (node) => account(await profileOf(node.recipientKey))));
            if (mine !== generation.current)
                return;
            setRecipients(rows);
            const info = {};
            await Promise.all(tree.map(async (node) => {
                info[node.recipientKey] = await Promise.all(node.rates.map(async (rate) => {
                    const agentAccounts = await Promise.all(rate.agents.map(async (agent) => {
                        const total = agent.rates.reduce((sum, r) => {
                            try {
                                return sum + BigInt(r.stakedSPCoins || '0');
                            }
                            catch {
                                return sum;
                            }
                        }, 0n);
                        return {
                            account: account(await profileOf(agent.agentKey)),
                            stakedSPCoins: total.toString(),
                            agentRates: agent.rates.map((r) => ({ agentRateKey: r.agentRateKey, stakedSPCoins: r.stakedSPCoins })),
                        };
                    }));
                    return { rateKey: rate.recipientRateKey, stakedSPCoins: rate.stakedSPCoins, agentAccounts };
                }));
            }));
            if (mine !== generation.current)
                return;
            setStakeInfoByAddress(info);
            snapshots.set(cacheKey, { recipients: rows, stakeInfoByAddress: info });
        }
        catch (err) {
            if (mine === generation.current)
                setError(String(err?.message ?? err));
        }
        finally {
            if (mine === generation.current)
                setLoading(false);
        }
    }, [sponsor, host]);
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
    const handleConfirmUnstake = useCallback(async (target, amount) => {
        const { recipient, rateKey, agent, agentRateKey, amount: targetAmount } = target;
        setActiveUnstakeKey([String(recipient.address ?? '').trim(), rateKey ?? '', agent ? String(agent.address ?? '').trim() : '', agentRateKey ?? ''].join('|').toLowerCase());
        try {
            await host.prepare?.();
            const qty = amount !== undefined && amount !== targetAmount ? parseUnits(amount, decimals) : undefined;
            const result = await unstakeSpCoin({ read: host.read, send: host.send }, sponsor, String(recipient.address ?? '').trim(), rateKey, agent ? String(agent.address ?? '').trim() : undefined, agentRateKey, qty);
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
    const activeAccount = exchangeContext?.apiCoreSyncedMembers?.accounts?.activeAccount;
    return (_jsx(SponsorStakingListPanel, { recipients: recipients, stakeInfoByAddress: stakeInfoByAddress, decimals: decimals, loading: loading, error: error, activeUnstakeKey: activeUnstakeKey, accountCellSlot: host.accountCellSlot, avatarSlot: host.avatarSlot, loadingContent: host.loadingContent, confirmPopupContent: ({ isOpen, target, totalAmount, onConfirm, onCancel }) => (_jsx(StakeConfirmPopup, { isOpen: isOpen, mode: "REVOKE", isSpCoin: true, spCoinContract: host.spCoinContract, activeAccount: activeAccount, recipientAccount: target?.recipient, agentAccount: target?.agent, hasAgent: Boolean(target?.agent), totalAmount: totalAmount, onCancel: onCancel, onConfirm: onConfirm })), onConfirmUnstake: handleConfirmUnstake }));
}
