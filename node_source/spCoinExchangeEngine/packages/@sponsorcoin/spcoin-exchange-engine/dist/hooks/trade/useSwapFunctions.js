// File: hooks/trade/useSwapFunctions.ts
// Phase 5 (2026-09-28) — portable swap/stake/approve state machine.
// Ported from web-app-local lib/spCoin/swap.tsx. Key change: uses
// TradeExecutorContext (injected per-transaction by the caller) instead of
// calling getConnectedSigner directly. The onchain execution primitives
// (executeErc20Approve, executeUniswapV3Swap, executeMultiHopUniswapV3Swap,
// executeStakeTransactionCore) come from @sponsorcoin/spcoin-onchain.
import { useCallback, useState } from 'react';
import { formatUnits } from 'viem';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { MESSAGE_ACCOUNTS_MARKER, STATUS } from '@sponsorcoin/spcoin-common/context';
import { useExchangeContext } from '../useExchangeContext';
import { useSponsorMode } from './useSponsorMode';
import { useSellAmount } from './useAmounts';
import { useBuyTokenContract } from '../dropDowns/useBuyTokenContract';
import { usePanelTree } from '../../panelTree/usePanelTree';
import { stepThroughApprovalStore } from './stepThroughApprovalStore';
import { popupActiveStore } from './popupActiveStore';
import { sponsorSwapAmountStore } from './sponsorSwapAmountStore';
import { stakeRefreshStore } from './stakeRefreshStore';
import { sponsorRateConfigStore, deriveSponsorRatePercentages } from './sponsorRateConfigStore';
import { executeErc20Approve, executeUniswapV3Swap, executeMultiHopUniswapV3Swap, executeStakeTransactionCore, } from '@sponsorcoin/spcoin-onchain';
import { UNISWAP_V3_FEE_TIERS, getUniswapV3Addresses, getWrappedNativeAddress } from '@sponsorcoin/spcoin-onchain';
import { describeEthersError } from '../../utils/describeEthersError';
const RESPONSE_PANEL_DEBUG_DELAY_MS = 5000;
export function useSwapFunctions(params) {
    const { exchangeContext, setErrorMessage } = useExchangeContext();
    const tradeData = exchangeContext?.apiCoreSyncedMembers.tradeData;
    const { mode: sponsorMode } = useSponsorMode();
    const [sellAmount] = useSellAmount();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { openPanel } = usePanelTree();
    const [buyTokenContract] = useBuyTokenContract();
    const network = exchangeContext?.apiCoreSyncedMembers?.network;
    const sponsorQuoteAppChainId = Number(network?.appChainId ?? 0);
    const { buildTradeExecutorContext, activeSpCoinAddress, sponsorQuote, abi, readStep, queryClient, decodeSpCoinError, pushTradeExecutionLock, waitForManualAdvance, debugTrace, } = params;
    const doStake = useCallback(async () => {
        const sponsorKey = String(exchangeContext?.apiCoreSyncedMembers?.accounts?.activeAccount?.address ?? '').trim();
        const recipientKey = String(exchangeContext?.apiCoreSyncedMembers?.accounts?.recipientAccount?.address ?? '').trim();
        const agentKey = String(exchangeContext?.apiCoreSyncedMembers?.accounts?.agentAccount?.address ?? '').trim();
        const contractAddress = String(activeSpCoinAddress ?? '').trim();
        const rpcUrl = String(network?.rpcUrl ?? '').trim();
        const appChainId = Number(network?.appChainId ?? 0);
        const chainId = Number(network?.chainId ?? 0);
        const networkSymbol = String(network?.symbol ?? '').trim();
        const isHardhatNetwork = appChainId === 31337 || chainId === 31337 || networkSymbol.toUpperCase() === 'HH_BASE';
        const readMode = isHardhatNetwork ? 'hardhat' : 'metamask';
        const accessSource = exchangeContext?.settings?.packageAccessManagers?.['@sponsorcoin/spcoin-access-modules']?.source === 'node' ? 'node_modules' : 'local';
        const recipientRateRangeRaw = exchangeContext?.settings?.spCoinContract?.recipientRateRange;
        const agentRateRangeRaw = exchangeContext?.settings?.spCoinContract?.agentRateRange;
        const recipientRateRange = Array.isArray(recipientRateRangeRaw)
            ? [Number(recipientRateRangeRaw[0] ?? 0), Number(recipientRateRangeRaw[1] ?? 0)] : [0, 0];
        const agentRateRange = Array.isArray(agentRateRangeRaw)
            ? [Number(agentRateRangeRaw[0] ?? 0), Number(agentRateRangeRaw[1] ?? 0)] : [0, 0];
        const rateConfig = sponsorRateConfigStore.get();
        const desiredRecipientRateKey = Math.min(Math.max(rateConfig.sponsorStep, recipientRateRange[0]), recipientRateRange[1]);
        const desiredAgentRateKey = Math.min(Math.max(rateConfig.agentStep, agentRateRange[0]), agentRateRange[1]);
        const { sponsorPct, recipientPct, agentPct } = deriveSponsorRatePercentages(rateConfig, recipientRateRange, agentRateRange);
        const effectiveAgentKey = agentPct === 0 ? '' : agentKey;
        const decimalsRaw = exchangeContext?.settings?.spCoinContract?.decimals;
        const decimals = Number.isInteger(decimalsRaw) && Number(decimalsRaw) >= 0 ? Number(decimalsRaw) : 18;
        if (!contractAddress || !rpcUrl) {
            setErrorMessage({ errCode: 0, msg: 'SpCoin contract/network is not ready yet.', source: 'swap:doStake', status: STATUS.MESSAGE_ERROR });
            openPanel(SP_COIN_DISPLAY.MESSAGE_PANEL, 'swap:doStake:notReady');
            return;
        }
        setIsSubmitting(true);
        pushTradeExecutionLock({
            active: true, kind: 'stake', contractAddress, chainId: appChainId,
            activeAccountAddress: sponsorKey, rpcUrl, source: 'MeritExchangeContext',
        });
        debugTrace?.('swap:doStake:attempt', { contractAddress, chainId, appChainId, readMode, accessSource, sponsorKey, recipientKey, agentKey: effectiveAgentKey || '(none)', amountRaw: sellAmount?.toString?.() ?? String(sellAmount), desiredRecipientRateKey, desiredAgentRateKey, recipientRateRange, agentRateRange, decimals });
        let tradeResult;
        const hasAgentForApproval = Boolean(effectiveAgentKey);
        const symbolForApproval = String(exchangeContext?.settings?.spCoinContract?.symbol ?? '').trim();
        const amountValueForApproval = formatUnits(sellAmount, decimals);
        const sponsorAccountForApproval = exchangeContext?.apiCoreSyncedMembers?.accounts?.activeAccount;
        const recipientAccountForApproval = exchangeContext?.apiCoreSyncedMembers?.accounts?.recipientAccount;
        const agentAccountForApproval = exchangeContext?.apiCoreSyncedMembers?.accounts?.agentAccount;
        const approvalAccounts = [
            ...(sponsorAccountForApproval ? [{ role: 'SPONSOR', account: sponsorAccountForApproval }] : []),
            ...(recipientAccountForApproval ? [{ role: 'RECIPIENT', account: recipientAccountForApproval }] : []),
            ...(hasAgentForApproval && agentAccountForApproval ? [{ role: 'AGENT', account: agentAccountForApproval }] : []),
        ];
        try {
            const context = await buildTradeExecutorContext({ title: 'Staking Transaction', contractAddress, accounts: approvalAccounts, amount: { label: symbolForApproval ? `Stake ${symbolForApproval}` : 'Stake spCoins', value: amountValueForApproval }, skipMandatoryApprovalGate: true }, appChainId, rpcUrl);
            const result = await executeStakeTransactionCore({
                recipientKey, agentKey: effectiveAgentKey, amountRaw: sellAmount,
                desiredRecipientRateKey, desiredAgentRateKey,
                recipientRateRange, agentRateRange,
                readParams: { contractAddress, rpcUrl, accessSource, readMode },
                abi: abi, readStep: readStep,
                chainId: appChainId,
                context,
                onConfirmed: async () => {
                    stakeRefreshStore.bump();
                    if (queryClient?.invalidateQueries) {
                        queryClient.invalidateQueries({
                            predicate: (query) => {
                                const key = query.queryKey[0];
                                return typeof key === 'string' && key.startsWith('balance:');
                            },
                        });
                    }
                },
            });
            const receipt = result.receipt;
            const symbol = String(exchangeContext?.settings?.spCoinContract?.symbol ?? '').trim();
            const amountValue = formatUnits(sellAmount, decimals);
            const summaryRows = [['Contract', contractAddress], ['Method', result.methodName], ['Block', receipt ? String(receipt.blockNumber) : 'N/A'], ['Gas Used', receipt ? String(receipt.gasUsed) : 'N/A']];
            const detailRows = [['Status', receipt ? (receipt.status === 1 ? 'Success' : 'Failed') : 'Unknown']];
            const sponsorAccount = exchangeContext?.apiCoreSyncedMembers?.accounts?.activeAccount;
            const recipientAccount = exchangeContext?.apiCoreSyncedMembers?.accounts?.recipientAccount;
            const agentAccount = exchangeContext?.apiCoreSyncedMembers?.accounts?.agentAccount;
            const accounts = [
                ...(sponsorAccount ? [{ role: 'SPONSOR', account: sponsorAccount, detail: `Sponsor Rate: ${sponsorPct}%` }] : []),
                ...(recipientAccount ? [{ role: 'RECIPIENT', account: recipientAccount, detail: `Recipient Rate: ${recipientPct}%` }] : []),
                ...(effectiveAgentKey && agentAccount ? [{ role: 'AGENT', account: agentAccount, detail: `Agent Rate: ${agentPct}%` }] : []),
            ];
            tradeResult = { status: 'success', summary: 'Stake confirmed.' };
            setErrorMessage({
                errCode: 0,
                msg: ['Stake confirmed.', '', 'Transaction Hash', result.transactionHash, '',
                    ...summaryRows.map(([label, value]) => `${label}: ${value}`),
                    '', '--------------------------------', '', 'Transaction Details',
                    ...detailRows.map(([label, value]) => `${label}: ${value}`),
                    MESSAGE_ACCOUNTS_MARKER].join('\n'),
                source: 'swap:doStake', status: STATUS.SUCCESS, accounts,
                amount: { label: symbol ? `Staked ${symbol}` : 'Staked spCoins', value: amountValue },
            });
            setTimeout(() => { openPanel(SP_COIN_DISPLAY.MESSAGE_PANEL, 'swap:doStake:success'); }, RESPONSE_PANEL_DEBUG_DELAY_MS);
        }
        catch (error) {
            const detail = describeEthersError(error);
            const decoded = decodeSpCoinError(error);
            debugTrace?.('swap:doStake:error', { contractAddress, chainId, readMode: readMode, decodedCode: decoded?.code, decodedLabel: decoded?.label, detail, errorDataType: typeof error?.data, errorMessage: error instanceof Error ? error.message : undefined });
            const sponsorAccountOnError = exchangeContext?.apiCoreSyncedMembers?.accounts?.activeAccount;
            const accounts = decoded && sponsorAccountOnError ? [{ role: 'SPONSOR', account: sponsorAccountOnError }] : [];
            tradeResult = { status: 'error', summary: decoded?.label ?? detail };
            setErrorMessage({
                errCode: decoded?.code ?? 0,
                msg: decoded ? [decoded.label, '', MESSAGE_ACCOUNTS_MARKER, '', '--------------------------------', '', detail].join('\n') : detail,
                source: 'swap:doStake', status: STATUS.MESSAGE_ERROR, accounts,
            });
            openPanel(SP_COIN_DISPLAY.MESSAGE_PANEL, 'swap:doStake:error');
        }
        finally {
            setIsSubmitting(false);
            pushTradeExecutionLock({ active: false, kind: 'stake', result: tradeResult, contractAddress, chainId: appChainId, activeAccountAddress: sponsorKey, rpcUrl, source: 'MeritExchangeContext' });
        }
    }, [exchangeContext, activeSpCoinAddress, sellAmount, openPanel]);
    const doApprovePayToken = useCallback(async () => {
        const payTokenContract = tradeData?.sellTokenContract;
        const tokenAddress = String(payTokenContract?.address ?? '').trim();
        const appChainId = Number(network?.appChainId ?? 0);
        const spenderAddress = String(getUniswapV3Addresses(appChainId)?.swapRouter02 ?? '').trim();
        const activeAccountAddress = String(exchangeContext?.apiCoreSyncedMembers?.accounts?.activeAccount?.address ?? '').trim();
        const rpcUrl = String(network?.rpcUrl ?? '').trim();
        const decimalsRaw = payTokenContract?.decimals;
        const decimals = Number.isInteger(decimalsRaw) && Number(decimalsRaw) >= 0 ? Number(decimalsRaw) : 18;
        const symbol = String(payTokenContract?.symbol ?? '').trim();
        const activeAccount = exchangeContext?.apiCoreSyncedMembers?.accounts?.activeAccount;
        if (!tokenAddress || !spenderAddress || !rpcUrl) {
            setErrorMessage({ errCode: 0, msg: 'Pay token/Uniswap router is not ready yet.', source: 'swap:doApprovePayToken', status: STATUS.MESSAGE_ERROR });
            openPanel(SP_COIN_DISPLAY.MESSAGE_PANEL, 'swap:doApprovePayToken:notReady');
            return;
        }
        setIsSubmitting(true);
        debugTrace?.('swap:doApprovePayToken:attempt', { tokenAddress, spenderAddress, chainId: appChainId, amountRaw: sellAmount?.toString?.() ?? String(sellAmount), decimals });
        try {
            const context = await buildTradeExecutorContext({ label: 'Uniswap V3 spender request', title: 'Spending Authorization', contractAddress: tokenAddress, amount: { label: symbol ? `Approve ${symbol}` : 'Approve Token', value: formatUnits(sellAmount, decimals) }, tokens: payTokenContract ? [{ label: 'Approved', token: payTokenContract, detail: `${formatUnits(sellAmount, decimals)} ${symbol} — ${tokenAddress}` }] : [], accounts: activeAccount ? [{ role: 'ACCOUNT', account: activeAccount, detail: activeAccountAddress }] : [], skipMandatoryApprovalGate: true, manualAdvanceDebug: stepThroughApprovalStore.get() }, appChainId, rpcUrl);
            const result = await executeErc20Approve({ tokenAddress, spenderAddress, amountRaw: sellAmount, context, rpcUrl, chainId: appChainId });
            const receipt = result.receipt;
            if (stepThroughApprovalStore.get()) {
                await waitForManualAdvance?.();
            }
            const nativeSymbol = String(network?.symbol ?? '').trim() || 'ETH';
            const gasFeeEth = receipt ? formatUnits(BigInt(receipt.gasUsed) * BigInt(receipt.gasPrice ?? 0n), 18) : undefined;
            setErrorMessage({
                errCode: 0,
                msg: [`Approved ${symbol || 'token'} for spCoin.`, '', 'Transaction Hash', result.transactionHash, '',
                    `Contract: ${tokenAddress}`, 'Method: approve',
                    `Block: ${receipt ? String(receipt.blockNumber) : 'N/A'}`,
                    `Gas Used: ${receipt ? String(receipt.gasUsed) : 'N/A'}`, '',
                    'The swap-then-stake step that spends this allowance is not wired up yet — nothing else was submitted.'].join('\n'),
                source: 'swap:doApprovePayToken', status: STATUS.SUCCESS,
                ...(gasFeeEth ? { gasFee: `${gasFeeEth} ${nativeSymbol}` } : {}),
                accounts: activeAccount ? [{ role: 'ACCOUNT', account: activeAccount, detail: activeAccountAddress }] : [],
                tokens: payTokenContract ? [{ label: 'Approved', token: payTokenContract, detail: `${formatUnits(sellAmount, decimals)} ${symbol} — ${tokenAddress}` }] : [],
            });
            openPanel(SP_COIN_DISPLAY.MESSAGE_PANEL, 'swap:doApprovePayToken:success');
        }
        catch (error) {
            const detail = describeEthersError(error);
            const decoded = decodeSpCoinError(error);
            debugTrace?.('swap:doApprovePayToken:error', { tokenAddress, spenderAddress, chainId: appChainId, decodedCode: decoded?.code, decodedLabel: decoded?.label, detail, errorMessage: error instanceof Error ? error.message : undefined });
            setErrorMessage({
                errCode: decoded?.code ?? 0, msg: decoded ? `${decoded.label}\n\n${detail}` : detail,
                source: 'swap:doApprovePayToken', status: STATUS.MESSAGE_ERROR,
            });
            openPanel(SP_COIN_DISPLAY.MESSAGE_PANEL, 'swap:doApprovePayToken:error');
            popupActiveStore.set(false);
        }
        finally {
            setIsSubmitting(false);
        }
    }, [tradeData, exchangeContext, sellAmount, openPanel]);
    const doSwap = useCallback(async () => {
        const actionLabel = sponsorMode === 'SPONSOR' ? 'Adding a new sponsorship' : sponsorMode === 'REVOKE' ? 'Unstaking' : 'This swap';
        setErrorMessage({
            errCode: 0, msg: `${actionLabel} isn't wired up to a real execution path yet — nothing was submitted.`,
            source: 'swap:doSwap', status: STATUS.INFO,
        });
        openPanel(SP_COIN_DISPLAY.MESSAGE_PANEL, 'swap:doSwap:notImplemented');
    }, [tradeData, sponsorMode, openPanel]);
    const doSponsorStake = useCallback(async () => {
        const amountRaw = sponsorSwapAmountStore.get();
        const sponsorKey = String(exchangeContext?.apiCoreSyncedMembers?.accounts?.activeAccount?.address ?? '').trim();
        const recipientKey = String(exchangeContext?.apiCoreSyncedMembers?.accounts?.recipientAccount?.address ?? '').trim();
        const agentKey = String(exchangeContext?.apiCoreSyncedMembers?.accounts?.agentAccount?.address ?? '').trim();
        const contractAddress = String(activeSpCoinAddress ?? '').trim();
        const rpcUrl = String(network?.rpcUrl ?? '').trim();
        const appChainId = Number(network?.appChainId ?? 0);
        const chainId = Number(network?.chainId ?? 0);
        const networkSymbol = String(network?.symbol ?? '').trim();
        const isHardhatNetwork = appChainId === 31337 || chainId === 31337 || networkSymbol.toUpperCase() === 'HH_BASE';
        const readMode = isHardhatNetwork ? 'hardhat' : 'metamask';
        const accessSource = exchangeContext?.settings?.packageAccessManagers?.['@sponsorcoin/spcoin-access-modules']?.source === 'node' ? 'node_modules' : 'local';
        if (amountRaw <= 0n) {
            setErrorMessage({ errCode: 0, msg: 'No swapped spCoin amount on file to stake — return to Step 1 and run the swap again.', source: 'swap:doSponsorStake', status: STATUS.MESSAGE_ERROR });
            openPanel(SP_COIN_DISPLAY.MESSAGE_PANEL, 'swap:doSponsorStake:notReady');
            return false;
        }
        if (!contractAddress || !rpcUrl) {
            setErrorMessage({ errCode: 0, msg: 'SpCoin contract/network is not ready yet.', source: 'swap:doSponsorStake', status: STATUS.MESSAGE_ERROR });
            openPanel(SP_COIN_DISPLAY.MESSAGE_PANEL, 'swap:doSponsorStake:notReady');
            return false;
        }
        const recipientRateRangeRaw = exchangeContext?.settings?.spCoinContract?.recipientRateRange;
        const agentRateRangeRaw = exchangeContext?.settings?.spCoinContract?.agentRateRange;
        const recipientRateRange = Array.isArray(recipientRateRangeRaw)
            ? [Number(recipientRateRangeRaw[0] ?? 0), Number(recipientRateRangeRaw[1] ?? 0)] : [0, 0];
        const agentRateRange = Array.isArray(agentRateRangeRaw)
            ? [Number(agentRateRangeRaw[0] ?? 0), Number(agentRateRangeRaw[1] ?? 0)] : [0, 0];
        const rateConfig = sponsorRateConfigStore.get();
        const desiredRecipientRateKey = Math.min(Math.max(rateConfig.sponsorStep, recipientRateRange[0]), recipientRateRange[1]);
        const desiredAgentRateKey = Math.min(Math.max(rateConfig.agentStep, agentRateRange[0]), agentRateRange[1]);
        const { sponsorPct, recipientPct, agentPct } = deriveSponsorRatePercentages(rateConfig, recipientRateRange, agentRateRange);
        const effectiveAgentKey = agentPct === 0 ? '' : agentKey;
        const decimalsRaw = exchangeContext?.settings?.spCoinContract?.decimals;
        const decimals = Number.isInteger(decimalsRaw) && Number(decimalsRaw) >= 0 ? Number(decimalsRaw) : 18;
        setIsSubmitting(true);
        pushTradeExecutionLock({ active: true, kind: 'sponsorStake', contractAddress, chainId: appChainId, activeAccountAddress: sponsorKey, rpcUrl, source: 'MeritExchangeContext' });
        debugTrace?.('swap:doSponsorStake:attempt', { contractAddress, chainId, appChainId, readMode, accessSource, sponsorKey, recipientKey, agentKey: effectiveAgentKey || '(none)', amountRaw: amountRaw.toString(), desiredRecipientRateKey, desiredAgentRateKey, recipientRateRange, agentRateRange, decimals });
        let tradeResult;
        const hasAgentForApproval = Boolean(effectiveAgentKey);
        const symbolForApproval = String(exchangeContext?.settings?.spCoinContract?.symbol ?? '').trim();
        const amountValueForApproval = formatUnits(amountRaw, decimals);
        const sponsorAccountForApproval = exchangeContext?.apiCoreSyncedMembers?.accounts?.activeAccount;
        const recipientAccountForApproval = exchangeContext?.apiCoreSyncedMembers?.accounts?.recipientAccount;
        const agentAccountForApproval = exchangeContext?.apiCoreSyncedMembers?.accounts?.agentAccount;
        const approvalAccounts = [
            ...(sponsorAccountForApproval ? [{ role: 'SPONSOR', account: sponsorAccountForApproval }] : []),
            ...(recipientAccountForApproval ? [{ role: 'RECIPIENT', account: recipientAccountForApproval }] : []),
            ...(hasAgentForApproval && agentAccountForApproval ? [{ role: 'AGENT', account: agentAccountForApproval }] : []),
        ];
        try {
            const context = await buildTradeExecutorContext({ title: 'Staking Transaction', contractAddress, accounts: approvalAccounts, amount: { label: symbolForApproval ? `Stake ${symbolForApproval}` : 'Stake spCoins', value: amountValueForApproval }, skipMandatoryApprovalGate: true }, appChainId, rpcUrl);
            const result = await executeStakeTransactionCore({
                recipientKey, agentKey: effectiveAgentKey, amountRaw,
                desiredRecipientRateKey, desiredAgentRateKey,
                recipientRateRange, agentRateRange,
                readParams: { contractAddress, rpcUrl, accessSource, readMode },
                abi: abi, readStep: readStep,
                chainId: appChainId,
                context,
                onConfirmed: async () => {
                    stakeRefreshStore.bump();
                    if (queryClient?.invalidateQueries) {
                        queryClient.invalidateQueries({
                            predicate: (query) => {
                                const key = query.queryKey[0];
                                return typeof key === 'string' && key.startsWith('balance:');
                            },
                        });
                    }
                },
            });
            const receipt = result.receipt;
            const symbol = String(exchangeContext?.settings?.spCoinContract?.symbol ?? '').trim();
            const amountValue = formatUnits(amountRaw, decimals);
            const nativeSymbol = String(network?.symbol ?? '').trim() || 'ETH';
            const gasFeeEth = receipt ? formatUnits(receipt.gasUsed * receipt.gasPrice, 18) : undefined;
            const summaryRows = [['Staked', `${amountValue} ${symbol || 'spCoin'}`], ['Contract', contractAddress], ['Method', result.methodName], ['Block', receipt ? String(receipt.blockNumber) : 'N/A'], ['Gas Used', receipt ? String(receipt.gasUsed) : 'N/A'], ['Gas Fee', gasFeeEth ? `${gasFeeEth} ${nativeSymbol}` : 'N/A']];
            const detailRows = [['Status', receipt ? (receipt.status === 1 ? 'Success' : 'Failed') : 'Unknown']];
            const sponsorAccount = exchangeContext?.apiCoreSyncedMembers?.accounts?.activeAccount;
            const recipientAccount = exchangeContext?.apiCoreSyncedMembers?.accounts?.recipientAccount;
            const agentAccount = exchangeContext?.apiCoreSyncedMembers?.accounts?.agentAccount;
            const accounts = [
                ...(sponsorAccount ? [{ role: 'SPONSOR', account: sponsorAccount, detail: `Sponsor Rate: ${sponsorPct}%` }] : []),
                ...(recipientAccount ? [{ role: 'RECIPIENT', account: recipientAccount, detail: `Recipient Rate: ${recipientPct}%` }] : []),
                ...(effectiveAgentKey && agentAccount ? [{ role: 'AGENT', account: agentAccount, detail: `Agent Rate: ${agentPct}%` }] : []),
            ];
            tradeResult = { status: 'success', summary: 'Sponsorship staked.' };
            setErrorMessage({
                errCode: 0,
                msg: ['Sponsorship staked.', '', 'Transaction Hash', result.transactionHash, '',
                    ...summaryRows.map(([label, value]) => `${label}: ${value}`),
                    '', '--------------------------------', '', 'Transaction Details',
                    ...detailRows.map(([label, value]) => `${label}: ${value}`),
                    MESSAGE_ACCOUNTS_MARKER].join('\n'),
                source: 'swap:doSponsorStake', status: STATUS.SUCCESS, accounts,
                amount: { label: symbol ? `Staked ${symbol}` : 'Staked spCoins', value: amountValue },
                ...(gasFeeEth ? { gasFee: `${gasFeeEth} ${nativeSymbol}` } : {}),
            });
            openPanel(SP_COIN_DISPLAY.MESSAGE_PANEL, 'swap:doSponsorStake:success');
            sponsorSwapAmountStore.set(0n);
            return true;
        }
        catch (error) {
            const detail = describeEthersError(error);
            const decoded = decodeSpCoinError(error);
            debugTrace?.('swap:doSponsorStake:error', { contractAddress, chainId, readMode, decodedCode: decoded?.code, decodedLabel: decoded?.label, detail, errorDataType: typeof error?.data, errorMessage: error instanceof Error ? error.message : undefined });
            const sponsorAccountOnError = exchangeContext?.apiCoreSyncedMembers?.accounts?.activeAccount;
            const accounts = decoded && sponsorAccountOnError ? [{ role: 'SPONSOR', account: sponsorAccountOnError }] : [];
            tradeResult = { status: 'error', summary: decoded?.label ?? detail };
            setErrorMessage({
                errCode: decoded?.code ?? 0,
                msg: decoded ? [decoded.label, '', MESSAGE_ACCOUNTS_MARKER, '', '--------------------------------', '', detail].join('\n') : detail,
                source: 'swap:doSponsorStake', status: STATUS.MESSAGE_ERROR, accounts,
            });
            openPanel(SP_COIN_DISPLAY.MESSAGE_PANEL, 'swap:doSponsorStake:error');
            return false;
        }
        finally {
            setIsSubmitting(false);
            pushTradeExecutionLock({ active: false, kind: 'sponsorStake', result: tradeResult, contractAddress, chainId: appChainId, activeAccountAddress: sponsorKey, rpcUrl, source: 'MeritExchangeContext' });
        }
    }, [exchangeContext, activeSpCoinAddress, sellAmount, openPanel]);
    const doSponsorSwap = useCallback(async () => {
        const sellTokenContract = tradeData?.sellTokenContract;
        const sellAddress = String(sellTokenContract?.address ?? '').trim();
        const buyAddress = String(buyTokenContract?.address ?? '').trim();
        const activeAccountAddress = String(exchangeContext?.apiCoreSyncedMembers?.accounts?.activeAccount?.address ?? '').trim();
        const rpcUrl = String(network?.rpcUrl ?? '').trim();
        const sellDecimals = sellTokenContract?.decimals ?? 18;
        const buySymbol = buyTokenContract?.symbol ?? '';
        const sellSymbol = sellTokenContract?.symbol ?? '';
        const activeAccount = exchangeContext?.apiCoreSyncedMembers?.accounts?.activeAccount;
        if (!sellAddress || !buyAddress || !activeAccountAddress || !rpcUrl || !sponsorQuote || sellAmount <= 0n) {
            setErrorMessage({ errCode: 0, msg: 'Quote/account not ready yet — try again once a live Uniswap quote is showing.', source: 'swap:doSponsorSwap', status: STATUS.MESSAGE_ERROR });
            openPanel(SP_COIN_DISPLAY.MESSAGE_PANEL, 'swap:doSponsorSwap:notReady');
            return false;
        }
        const routerAddress = getUniswapV3Addresses(sponsorQuoteAppChainId)?.swapRouter02 ?? '(unknown)';
        setIsSubmitting(true);
        pushTradeExecutionLock({ active: true, kind: 'sponsorSwap', contractAddress: routerAddress, chainId: sponsorQuoteAppChainId, activeAccountAddress, rpcUrl, source: 'MeritExchangeContext' });
        debugTrace?.('swap:doSponsorSwap:attempt', { sellAddress, buyAddress, chainId: sponsorQuoteAppChainId, amountRaw: sellAmount.toString(), isMultiHop: sponsorQuote.isMultiHop });
        let tradeResult;
        try {
            const context = await buildTradeExecutorContext({ label: 'Uniswap V3 swap', title: 'Confirm Swap', contractAddress: routerAddress, amount: { label: sellSymbol ? `Swap ${sellSymbol}` : 'Swap Token', value: formatUnits(sellAmount, sellDecimals) }, tokens: sellTokenContract ? [{ label: 'Selling', token: sellTokenContract, detail: `${formatUnits(sellAmount, sellDecimals)} ${sellSymbol} — ${sellAddress}` }] : [], accounts: activeAccount ? [{ role: 'ACCOUNT', account: activeAccount, detail: activeAccountAddress }] : [], skipMandatoryApprovalGate: true }, sponsorQuoteAppChainId, rpcUrl);
            const rawSlippageBps = tradeData?.slippage?.bps;
            const slippageBps = Number.isFinite(rawSlippageBps) ? rawSlippageBps : 100;
            const amountOutMinimum = (sponsorQuote.amountOut * BigInt(10000 - slippageBps)) / 10000n;
            let result;
            if (sponsorQuote.isMultiHop) {
                const through = getWrappedNativeAddress(sponsorQuoteAppChainId);
                if (!through)
                    throw new Error(`No wrapped-native address on file for chain ${sponsorQuoteAppChainId}`);
                result = await executeMultiHopUniswapV3Swap({
                    chainId: sponsorQuoteAppChainId, tokenIn: sellAddress, through, tokenOut: buyAddress,
                    amountIn: sellAmount, amountOutMinimum, recipient: activeAccountAddress,
                    feeIn: UNISWAP_V3_FEE_TIERS.MEDIUM, context, rpcUrl,
                });
            }
            else {
                result = await executeUniswapV3Swap({
                    chainId: sponsorQuoteAppChainId, tokenIn: sellAddress, tokenOut: buyAddress,
                    amountIn: sellAmount, amountOutMinimum, recipient: activeAccountAddress,
                    fee: UNISWAP_V3_FEE_TIERS.MEDIUM, context, rpcUrl,
                });
            }
            const receipt = result.receipt;
            const buyDecimals = buyTokenContract?.decimals ?? 18;
            const nativeSymbol = String(network?.symbol ?? '').trim() || 'ETH';
            const gasFeeEth = receipt ? formatUnits(receipt.gasUsed * receipt.gasPrice, 18) : undefined;
            tradeResult = { status: 'success', summary: `${sellSymbol || 'Token'} swapped for ${buySymbol || 'spCoin'} via Uniswap V3.` };
            setErrorMessage({
                errCode: 0,
                msg: ['Swap Receipt', '', `${sellSymbol || 'Token'} swapped for ${buySymbol || 'spCoin'} via Uniswap V3.`, '',
                    'Transaction Hash', result.transactionHash, '',
                    `Contract: ${routerAddress}`,
                    `Method: ${sponsorQuote.isMultiHop ? 'exactInput (multi-hop via WETH)' : 'exactInputSingle'}`,
                    `Block: ${receipt ? String(receipt.blockNumber) : 'N/A'}`,
                    `Gas Used: ${receipt ? String(receipt.gasUsed) : 'N/A'}`, '',
                    'The stake step that puts this spCoin to work for the recipient is not wired up yet — nothing else was submitted.'].join('\n'),
                source: 'swap:doSponsorSwap', status: STATUS.SUCCESS,
                amount: { label: buySymbol ? `Received ${buySymbol}` : 'Received', value: formatUnits(sponsorQuote.amountOut, buyDecimals) },
                ...(gasFeeEth ? { gasFee: `${gasFeeEth} ${nativeSymbol}` } : {}),
                accounts: activeAccount ? [{ role: 'ACCOUNT', account: activeAccount, detail: activeAccountAddress }] : [],
                tokens: [
                    ...(sellTokenContract ? [{ label: 'Sold', token: sellTokenContract, detail: `${formatUnits(sellAmount, sellDecimals)} ${sellSymbol} — ${sellAddress}` }] : []),
                    ...(buyTokenContract ? [{ label: 'Received (quoted, min accepted below)', token: buyTokenContract, detail: `${formatUnits(sponsorQuote.amountOut, buyDecimals)} ${buySymbol} (min ${formatUnits(amountOutMinimum, buyDecimals)}) — ${buyAddress}` }] : []),
                ],
            });
            sponsorSwapAmountStore.set(sponsorQuote.amountOut);
            return true;
        }
        catch (error) {
            const detail = describeEthersError(error);
            const decoded = decodeSpCoinError(error);
            debugTrace?.('swap:doSponsorSwap:error', { sellAddress, buyAddress, chainId: sponsorQuoteAppChainId, decodedCode: decoded?.code, decodedLabel: decoded?.label, detail, errorMessage: error instanceof Error ? error.message : undefined });
            tradeResult = { status: 'error', summary: decoded?.label ?? detail };
            setErrorMessage({
                errCode: decoded?.code ?? 0,
                msg: decoded ? `${decoded.label}\n\n${detail}` : detail,
                source: 'swap:doSponsorSwap', status: STATUS.MESSAGE_ERROR,
            });
            openPanel(SP_COIN_DISPLAY.MESSAGE_PANEL, 'swap:doSponsorSwap:error');
            return false;
        }
        finally {
            setIsSubmitting(false);
            pushTradeExecutionLock({ active: false, kind: 'sponsorSwap', result: tradeResult, contractAddress: routerAddress, chainId: sponsorQuoteAppChainId, activeAccountAddress, rpcUrl, source: 'MeritExchangeContext' });
        }
    }, [tradeData, buyTokenContract, exchangeContext, sponsorQuote, sponsorQuoteAppChainId, sellAmount, openPanel]);
    const swap = useCallback(async () => {
        if (sponsorMode === 'STAKE') {
            await doStake();
            return 'STAKE';
        }
        await doSwap();
        return 'SWAP';
    }, [doSwap, doStake, sponsorMode]);
    return { swap, doApprovePayToken, doSponsorSwap, doSponsorStake, isSubmitting };
}
export default useSwapFunctions;
