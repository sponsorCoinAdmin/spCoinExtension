import React from 'react';
export interface ExchangeTradingPairProps {
    sellLabel?: string;
    sellAmount?: string;
    onSellAmountChange?: (value: string) => void;
    sellAmountDisabled?: boolean;
    sellSymbol?: string;
    sellAddress?: string;
    sellIcon?: React.ReactNode;
    onSellTokenClick?: (e: React.SyntheticEvent) => void;
    sellBalanceText?: string;
    sellBalanceClickable?: boolean;
    onSellBalanceClick?: () => void;
    buyLabel?: string;
    buyAmount?: string;
    onBuyAmountChange?: (value: string) => void;
    buyAmountDisabled?: boolean;
    buySymbol?: string;
    buyAddress?: string;
    buyIcon?: React.ReactNode;
    onBuyTokenClick?: (e: React.SyntheticEvent) => void;
    buyBalanceText?: string;
    /** Slippage-settings cog — real app shows this on the buy row only
     *  (SlippageComponent.tsx's `isBuy` gating on the cog). */
    onCogClick?: () => void;
    onSwapDirection?: () => void;
    /** 2026-09-24, on request — the real app's buy slot also stacks
     *  ConfigSlippagePanel (above the buy row) and UniSelectPanel (below
     *  it) in the same wrapper the buy TradeAmountRow lives in. Neither
     *  belongs to this package (ExchangeContext-bound, not portable), so
     *  these are opaque slots, not new owned content — a caller supplies
     *  its own gap/visibility wrapping (see the real app's
     *  ExchangeTradingPair.tsx), this component just places them in the
     *  right position relative to the buy row. Both optional — a caller
     *  with nothing extra (e.g. the extension's own inert MeritWallet.tsx
     *  usage) renders identically to before these props existed. */
    buyPrefixContent?: React.ReactNode;
    buySuffixContent?: React.ReactNode;
    /** 2026-09-25, on request (real regression report) — SELL_SELECT_PANEL
     *  and ZERO_X_SELECT_PANEL are independently-visible panel-tree nodes in
     *  the real app (e.g. the 0x quote engine's own checkbox hides the buy
     *  row, sell stays up) — this component previously had no way to
     *  express "hide this row," always rendering both. Default true
     *  (backward compatible — the extension's own inert MeritWallet.tsx
     *  usage never passes these). false hides only the TradeAmountRow
     *  itself; the wrapper div (and, for sell, the swap arrow, which is
     *  gated on this component's own visibility, not either row's) stays,
     *  matching the real app's own per-row `if (!visible) return null`. */
    sellVisible?: boolean;
    buyVisible?: boolean;
    /** 2026-09-25, on request — SWAP_ARROW_BUTTON (26) is a real, distinct
     *  panel-tree node, never wired to any visibility check here (it always
     *  rendered unconditionally, in both this component's pre-consolidation
     *  self-composed form and this one). Default true, backward compatible. */
    arrowVisible?: boolean;
}
export default function ExchangeTradingPair({ sellLabel, sellAmount, onSellAmountChange, sellAmountDisabled, sellSymbol, sellAddress, sellIcon, onSellTokenClick, sellBalanceText, sellBalanceClickable, onSellBalanceClick, buyLabel, buyAmount, onBuyAmountChange, buyAmountDisabled, buySymbol, buyAddress, buyIcon, onBuyTokenClick, buyBalanceText, onCogClick, onSwapDirection, buyPrefixContent, buySuffixContent, sellVisible, buyVisible, arrowVisible, }: ExchangeTradingPairProps): React.JSX.Element;
