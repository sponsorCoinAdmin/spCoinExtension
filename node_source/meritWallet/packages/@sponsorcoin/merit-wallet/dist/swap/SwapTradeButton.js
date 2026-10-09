// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/swap/SwapTradeButton.tsx
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt, table row 22) -- the Swap tab's 0x trade button for a host that has no web trading pipeline (the
// extension). It is the content the Merit Wallet component's zeroXTradeButtonContent slot takes. The state (tokens, amount, price, swapping) is
// useSwapQuote; the price is written into the buy amount field; the button shows what the user can do: pick a pair, enter an amount, wait, or Swap.
// A click hands the swap to the host's execute function, which signs through its own approval screen. No keys and no host imports here.
'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { walletColors } from '@sponsorcoin/spcoin-common/styles';
import { ConnectButton, useConnectMode } from '@sponsorcoin/spcoin-panels';
import { useSwapQuote } from './useSwapQuote';
export default function SwapTradeButton({ host }) {
    const q = useSwapQuote(host, { writeBuyAmount: true });
    // 2026-10-09: no active account -> a Connect button instead of the swap button.
    const { connectMode } = useConnectMode();
    if (connectMode)
        return _jsx(ConnectButton, { id: "ZERO_X_CONNECT_BUTTON" });
    let label = 'Select Trading Pair';
    let disabled = true;
    if (q.sellAddress && q.buyAddress) {
        label = 'Enter an Amount';
        if (q.sellAmount > 0n) {
            if (q.loading)
                label = 'Getting price…';
            else if (q.error)
                label = q.error;
            else if (!q.hasAccount)
                label = 'Select an Account';
            else if (q.swapping)
                label = 'Swapping…';
            else if (q.price) {
                label = 'Swap';
                disabled = false;
            }
        }
    }
    return (_jsx("button", { type: "button", disabled: disabled, onClick: q.swap, style: {
            boxSizing: 'border-box',
            width: '100%',
            borderRadius: 8,
            border: 'none',
            background: walletColors.panel,
            color: disabled ? walletColors.accentSoft : '#ffffff',
            fontSize: 12,
            fontWeight: 600,
            padding: '10px 0',
            cursor: disabled ? 'default' : 'pointer',
        }, children: label }));
}
