// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/ExchangeTradingPair.tsx
// Portable placeholder for EXCHANGE_TRADING_PAIR (2026-09-13) — the real
// app version (components/views/TradingStationPanel/index.tsx) renders a
// `<div id="EXCHANGE_TRADING_PAIR">` containing exactly SellSelectPanel +
// BuySellSwapArrowButton in one slot and BuySelectPanel (+ConfigSlippagePanel/
// UniSelectPanel, both out of scope here) in a second slot, `gap-0` between
// the two — a real, distinct composition boundary separate from
// TRADING_STATION_PANEL's other children (CONNECT_TRADE_BUTTON,
// AFFILIATE_FEE, FEE_DISCLOSURE). Split out of TradingStationPanel.tsx (on
// request) so this package's own component boundary matches the real one:
// this file owns the sell/arrow/buy composition AND the swap-arrow's
// straddle-the-seam placement specifically, exactly what
// EXCHANGE_TRADING_PAIR owns in the real app — not a generic layout detail
// buried in the larger panel wrapper.
'use client';
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ExchangeTradingPair;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const TradeAmountRow_1 = __importDefault(require("./TradeAmountRow"));
// 2026-09-12 fix, on request — this used to diverge from the real app's
// own SWAP_ARROW_BUTTON (components/views/TradingStationPanel/
// SwapArrowButton/index.tsx) in every visual detail: a different lucide
// icon (ArrowDownUp instead of ArrowDown), a smaller icon, a fully round
// pill instead of a rounded square, and three colors that were all just
// approximations instead of the real app's exact ones. Matched exactly
// now — same icon+size, same border radius/width/color, same idle
// background/icon color, same hover-to-white transition — everything
// this component doesn't already share by construction (this is a
// portable placeholder with its own inert onSwapDirection, not the real
// app's live swap-direction logic) stays as-is.
//
// 2026-09-13 fix, on request, reversing the "positioning not matched"
// call originally here: the real button is absolutely anchored — `absolute
// bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-[9999]`, a child of
// the SELL row's own `position: relative` wrapper, sitting exactly half
// on/half off that row's bottom edge, straddling the seam with the row
// below it (the real EXCHANGE_TRADING_PAIR's `gap-0` between its two slots
// makes that seam a hard edge for the button to straddle). Replicated in
// this file's own default export below: the sell row's wrapper gets
// `position: relative`, this button is an absolutely-positioned sibling of
// it instead of its own flex row between the two rows, and the sell/buy
// rows sit flush (no gap) so the seam lines up under it.
function SwapArrowButton({ onClick }) {
    const [hovered, setHovered] = (0, react_1.useState)(false);
    return ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onClick, "aria-label": "Swap direction", onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false), style: {
            // 2026-09-13 fix, found during the same box-sizing audit as
            // TradeAmountRow.tsx: a fixed height/width + border with no
            // boxSizing:'border-box' rendered this larger than declared
            // (content-box adds border on top of the declared size).
            //
            // 2026-09-13, on request ("1 to 1 ratio... fix the app web size") —
            // scaled down along with TradeAmountRow.tsx's own resize (see that
            // file's header, point 6): real 24x24/3px-border shrunk to
            // 18x18/2px so it still reads as sitting on the seam between rows
            // at the new, smaller row height, instead of looking oversized
            // relative to the shrunk rows around it.
            // 2026-09-13, on request ("shrink everything... by 20% more") —
            // shrunk again to 14x14 (see TradeAmountRow.tsx's own header,
            // point 7, for the full pass). Border kept at 2px rather than
            // scaled further — same reasoning as that file's fonts not
            // shrinking in lockstep with padding: a border thinner than 2px
            // starts looking like an anti-aliasing artifact, not a real edge.
            boxSizing: 'border-box',
            position: 'absolute',
            bottom: 0,
            left: '50%',
            transform: 'translate(-50%, 50%)',
            zIndex: 10,
            display: 'flex',
            height: 14,
            width: 14,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 5,
            border: '2px solid #0E111B',
            background: '#3a4157',
            color: hovered ? '#ffffff' : '#5F6783',
            transition: 'color 300ms',
            cursor: onClick ? 'pointer' : 'default',
        }, children: (0, jsx_runtime_1.jsx)(lucide_react_1.ArrowDown, { size: 10 }) }));
}
function ExchangeTradingPair({ sellLabel = 'You Exactly Pay:', sellAmount, onSellAmountChange, sellAmountDisabled, sellSymbol, sellAddress, sellIcon, onSellTokenClick, sellBalanceText = 'Balance: 0', sellBalanceClickable, onSellBalanceClick, buyLabel = 'You Receive:', buyAmount, onBuyAmountChange, buyAmountDisabled, buySymbol, buyAddress, buyIcon, onBuyTokenClick, buyBalanceText = 'Balance: 0', onCogClick, onSwapDirection, }) {
    return (
    // 2026-09-12 fix, on request — "You Pay"/"You Receive" were this
    // package's own invented labels; the real app's default wording
    // (SlippageComponent.tsx's own sellText/buyText defaults, `plain`
    // branch: isSell -> "You Exactly ${sellText}:"`, else -> `${buyText}:`)
    // is "You Exactly Pay:" / "You Receive:". Matched verbatim as the
    // default — a real caller overrides via `sellLabel`/`buyLabel` with
    // the live, trade-direction-dependent variant (" ± N% slippage",
    // "(Uniswap V3)") it actually computes.
    //
    // 2026-09-13, on request — sell+buy rows sit in a zero-gap group
    // (matching the real EXCHANGE_TRADING_PAIR's own `gap-0` between its
    // sell/buy slots), with the arrow button an absolutely-positioned
    // sibling of the sell row instead of its own spaced-out flex row —
    // see SwapArrowButton's own comment above for why. The wrapper must
    // NOT clip (no overflow:hidden) or the button's bottom half would be
    // cut off by the sell row's own rounded corners.
    (0, jsx_runtime_1.jsxs)("div", { id: "EXCHANGE_TRADING_PAIR", style: { boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 0 }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { boxSizing: 'border-box', position: 'relative' }, children: [(0, jsx_runtime_1.jsx)(TradeAmountRow_1.default, { label: sellLabel, tokenIcon: sellIcon, tokenSymbol: sellSymbol, tokenAddress: sellAddress, onTokenPillClick: onSellTokenClick, amount: sellAmount, onAmountChange: onSellAmountChange, amountDisabled: sellAmountDisabled, balanceText: sellBalanceText, balanceClickable: sellBalanceClickable, onBalanceClick: onSellBalanceClick }), (0, jsx_runtime_1.jsx)(SwapArrowButton, { onClick: onSwapDirection })] }), (0, jsx_runtime_1.jsx)("div", { style: { boxSizing: 'border-box', paddingTop: 2 }, children: (0, jsx_runtime_1.jsx)(TradeAmountRow_1.default, { label: buyLabel, onCogClick: onCogClick, tokenIcon: buyIcon, tokenSymbol: buySymbol, tokenAddress: buyAddress, onTokenPillClick: onBuyTokenClick, amount: buyAmount, onAmountChange: onBuyAmountChange, amountDisabled: buyAmountDisabled, balanceText: buyBalanceText }) })] }));
}
