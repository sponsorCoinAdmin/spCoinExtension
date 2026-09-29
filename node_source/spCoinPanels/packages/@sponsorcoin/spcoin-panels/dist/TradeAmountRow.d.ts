import React from 'react';
export interface TradeAmountRowProps {
    label: string;
    /** 2026-09-13, on request — lets a caller highlight the label (e.g.
     *  UNI_SELECT_PANEL's real amber "You Receive (Uniswap V3):", matching
     *  its own `text-amber-400`) instead of every row defaulting to the same
     *  plain gray. Omit for today's default (`#94a3b8`). */
    labelColor?: string;
    /** Slippage-settings cog, shown inline right after the label — matches
     *  SlippageComponent.tsx's real cog placement (isBuy-only in the real
     *  app). Omit for no cog at all (today's default). */
    onCogClick?: () => void;
    /** Token/account pill content — icon + symbol/address. Omit for a plain
     *  "Select" pill with no entity. */
    tokenIcon?: React.ReactNode;
    tokenSymbol?: string;
    tokenAddress?: string;
    showTokenIdentity?: boolean;
    /** Omit for an inert pill (today's default) — provide to open a token
     *  picker, matching TokenSelectDropDown.tsx's real row-click behavior. */
    onTokenPillClick?: (e: React.SyntheticEvent) => void;
    onIconClick?: () => void;
    amount?: string;
    /** Provide to render a real, editable `<input>` instead of a static
     *  `<div>` (today's default when omitted). */
    onAmountChange?: (value: string) => void;
    amountDisabled?: boolean;
    /** 2026-09-13, on request — an optional small line under the amount, for
     *  UNI_SELECT_PANEL's real "multihop using weth" route-transparency note
     *  (`text-xs text-slate-500`). Omit for today's default (no extra line). */
    amountNote?: React.ReactNode;
    balanceText?: string;
    /** Whether the balance is currently click-to-fill-able — mirrors
     *  BalanceComponent.tsx's own `canClickToFill` (a real account/balance
     *  must be resolved, not just "an onBalanceClick happens to be passed").
     *  No effect unless `onBalanceClick` is also given. */
    balanceClickable?: boolean;
    onBalanceClick?: () => void;
}
export default function TradeAmountRow({ label, labelColor, onCogClick, tokenIcon, tokenSymbol, tokenAddress, showTokenIdentity, onTokenPillClick, onIconClick, amount, onAmountChange, amountDisabled, amountNote, balanceText, balanceClickable, onBalanceClick, }: TradeAmountRowProps): React.JSX.Element;
