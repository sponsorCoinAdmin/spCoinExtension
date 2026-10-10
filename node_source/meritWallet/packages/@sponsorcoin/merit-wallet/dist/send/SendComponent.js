// File: src/send/SendComponent.tsx
//
// 2026-10-10 (docs/nodeSourceMigrationPlan.txt row 16) -- the Send tab's content, moved from the web app's components/views/RadioOverlayPanels/SendComponent.tsx: the layout rows, the Send button and the transfer with its receipt card. The signer is the host's
// (the engine's registered transfer hook, useHostTransfer); refreshing balances after a send is the host's too (the web app's transfer hook does it), so nothing here depends on the web.
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useCallback } from 'react';
import { parseUnits } from 'viem';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { PANEL_GAP } from '@sponsorcoin/spcoin-common/styles';
import { describeEthersError, useApprovalPending, useErrorMessage, useExchangeContext, useHostTransfer, useNativeToken, usePanelTree, useSendTokenContract, useSurfaceBalanceError, } from '@sponsorcoin/spcoin-exchange-engine';
import { ComponentMarker, PanelGate, SendButton, SendLayoutContainer, useWalletTokenBalance } from '@sponsorcoin/spcoin-panels';
import { buildSendReceipt } from '../receipt/transactionReceipts';
// The standard native-token placeholder address.
const NATIVE_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
export default function SendComponent() {
    const [sendTokenContract] = useSendTokenContract();
    const nativeToken = useNativeToken();
    const { exchangeContext } = useExchangeContext();
    const [, setErrorMessage] = useErrorMessage();
    const { openPanel } = usePanelTree();
    const [amount, setAmount] = useState('0');
    const [isPending, setIsPending] = useState(false);
    const approvalPending = useApprovalPending();
    const token = sendTokenContract ?? nativeToken;
    const tokenSymbol = token?.symbol ?? 'TOKEN';
    const tokenAddr = token?.address;
    const tokenDecimals = token?.decimals ?? 18;
    // The native token's own `.address` is NATIVE_TOKEN_ADDRESS (a real,
    // truthy sentinel string, not undefined) — a bare `tokenAddr ? ... : ...`
    // check below used to treat that as "a real ERC20 contract" and call
    // contract.transfer() against it. That address has no deployed bytecode,
    // so the call silently no-opped (succeeded, produced a hash/receipt, but
    // moved nothing) instead of ever reaching sendNative's real
    // signer.sendTransaction({ value }) path. Found live 2026-08-25: a "Send
    // confirmed" ETH transfer whose receipt.to was the sentinel address
    // itself, not the recipient, and the recipient's on-chain balance never
    // moved. Compare against the sentinel explicitly instead.
    const isNativeSend = !tokenAddr || tokenAddr.toLowerCase() === NATIVE_TOKEN_ADDRESS.toLowerCase();
    // Full spCoinAccount objects (avatar.png, name, symbol — already hydrated
    // the same way doStake's sponsor/recipient/agent accounts are), not just
    // the raw address, so the MESSAGE_PANEL confirmation below can show a
    // real avatar row instead of a bare hex string.
    const toAccount = exchangeContext?.apiCoreSyncedMembers.accounts?.sendRecipientAddress;
    const fromAccount = exchangeContext?.apiCoreSyncedMembers.accounts?.activeAccount;
    const toAddress = toAccount?.address ?? '';
    const activeAccountAddr = fromAccount?.address;
    // 2026-10-05 — the wallet's shared balance source (header's active account + the host's fetcher).
    const { balance: balanceRaw, error: balanceError } = useWalletTokenBalance(tokenAddr, tokenDecimals);
    useSurfaceBalanceError(balanceError, 'SendComponent:senderBalance', fromAccount, 'Sender');
    const { transfer, sendNative } = useHostTransfer();
    const handleSend = useCallback(async () => {
        if (!toAddress)
            return;
        const decimals = token?.decimals ?? 18;
        const amountBigInt = parseUnits(amount.trim(), decimals);
        setIsPending(true);
        try {
            const { hash, receipt } = isNativeSend
                ? await sendNative(toAddress, amountBigInt)
                : await transfer(tokenAddr, toAddress, amountBigInt);
            if (hash) {
                // The result card is the package's buildSendReceipt (the same one the extension shows): the doStake-style message with Contract / Method for a token transfer,
                // Block and Gas Used, the sender and recipient rows, and the amount line.
                setErrorMessage(buildSendReceipt({
                    result: { ok: true, hash, receipt: receipt },
                    amount,
                    tokenSymbol,
                    tokenAddress: isNativeSend ? undefined : tokenAddr,
                    from: fromAccount ? { address: fromAccount.address, account: fromAccount } : undefined,
                    to: toAccount ? { address: toAccount.address, account: toAccount } : undefined,
                }));
                openPanel(SP_COIN_DISPLAY.MESSAGE_PANEL, 'SendComponent:handleSend:success');
            }
        }
        catch (error) {
            setErrorMessage(buildSendReceipt({
                result: { ok: false, message: describeEthersError(error) },
                amount,
                tokenSymbol,
                from: fromAccount ? { address: fromAccount.address, account: fromAccount } : undefined,
            }));
            openPanel(SP_COIN_DISPLAY.MESSAGE_PANEL, 'SendComponent:handleSend:error');
        }
        finally {
            setIsPending(false);
        }
    }, [
        toAddress,
        toAccount,
        fromAccount,
        token,
        amount,
        tokenAddr,
        isNativeSend,
        tokenSymbol,
        activeAccountAddr,
        transfer,
        sendNative,
        setErrorMessage,
        openPanel,
    ]);
    return (_jsxs("div", { className: "relative flex flex-1 flex-col", style: { gap: PANEL_GAP }, children: [_jsx(ComponentMarker, { path: "components/views/RadioOverlayPanels/SendComponent.tsx" }), _jsx(PanelGate, { panel: SP_COIN_DISPLAY.SEND_SELECT_PANEL, children: _jsx(SendLayoutContainer, { amount: amount, onAmountChange: setAmount }) }), _jsx(PanelGate, { panel: SP_COIN_DISPLAY.SEND_BUTTON, children: _jsx(SendButton, { amount: amount, decimals: tokenDecimals, balanceRaw: balanceRaw, hasRecipient: toAddress.length > 0, symbol: tokenSymbol, isPending: isPending, approvalPending: approvalPending, onSend: handleSend }) })] }));
}
