// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/TradeAmountRow.tsx
// Shared building block (2026-09-12) for the trade-shaped panels
// (TRADING_STATION_PANEL, SPONSORSHIP_PANEL, SEND_PANEL) — a labeled
// "you pay / you receive" row: label, token pill (icon + symbol/address),
// amount, balance. Real versions (SponsorPanel.tsx, SendComponent.tsx,
// TradingStationPanel) each read live token contracts, balances, and
// on-chain quotes — this is the shape only, entirely inert. Placeholder,
// not logic, per explicit instruction.
//
// 2026-09-13, on request — evolved from a purely inert placeholder into a
// component real, hook-driven callers can also render: every interactive
// bit (amount typing, the slippage cog, the token pill, click-to-fill
// balance) is now an OPTIONAL callback prop. Omitting all of them keeps
// today's exact inert look (static amount text, non-clickable pill/balance,
// no cog) — this is additive-only, no existing caller (the extension's
// sidepanel.ts, which passes none of these) needs to change. See
// components/views/TradingStationPanel/SellSelectPanel/
// SellSelectPanelLayoutContainer.tsx (spcoin-nextjs-front-end) for the real,
// hook-backed caller this was built for.
//
// 2026-09-13 — sizing history, kept literal since it explains a real,
// resolved investigation:
//   1. Originally a compact, normal-flow layout (own invented spacing).
//   2. Switched to the real component's exact literal Tailwind pixel
//      values (h-[106px] input, absolute-positioned label/pill/balance) —
//      "must be identical" — transliterated 1:1 from BaseSelectPanelInner/
//      SlippageComponent/AmountComponent/BalanceComponent/
//      TokenSelectDropDown.tsx.
//   3. A real bug was found and fixed here: every element needed an
//      explicit `boxSizing: 'border-box'` (Tailwind's own preflight sets
//      this globally; this package has no such reset), or a fixed
//      width/height + padding/border silently rendered LARGER than
//      declared under the browser's `content-box` default — confirmed by
//      direct measurement (238px actual vs the real component's own
//      explicit `min-h-[216px]`).
//   4. Once genuinely pixel-exact (verified: 216px, matching real), it was
//      STILL "too big" for the extension's narrow side panel — traced to a
//      separate, real cause: the web-vs-extension comparison driving this
//      was itself distorted by the two surfaces being viewed at different
//      browser zoom levels (confirmed live). The real component's true,
//      unzoomed size is genuinely large — designed for a wide desktop
//      modal — not a bug in this transliteration.
//   5. Briefly redone at a smaller, invented "compact" scale to fit the
//      panel directly — reverted at the time in favor of a GLOBAL
//      `transform: scale(...)` wrapper in sidepanel.html instead (kept
//      literal in git history, not here).
//   6. 2026-09-13, on request ("I honestly think we should have a 1 to 1
//      ratio. that is fix the app web size. I know it is more complicated,
//      but it is correct.") — the global-scale-hack approach (step 5) was
//      rejected in favor of THIS: shrink the actual, real, deployed size at
//      its one source, here, so the extension can render it at a true 1:1
//      (untransformed) scale and the web app gets the same, smaller,
//      better-fitting design too — not a synthetic per-surface CSS trick.
//      This is a real, deliberate redesign of the live component, not a
//      placeholder guess: `TradingStationPanel/SellSelectPanel` and
//      `BuySelectPanel` (spcoin-nextjs-front-end) already render this exact
//      file in production (`renderMode="layout"`), so this change lands on
//      the real web Swap tab as well as the extension — both surfaces stay
//      pixel-identical because they now run the literal same sized code,
//      which is the actual point. Every pixel value below was scaled down
//      from the step-2 real values by roughly 0.65-0.7x on spacing/icon
//      sizing and a gentler ~0.75x on font sizes (kept a hair larger so
//      text stays legible rather than shrinking in lockstep with padding).
//      NOTE — deliberately out of scope: the underlying real Tailwind
//      source this was transliterated from (SlippageComponent.tsx/
//      AmountComponent.tsx/BalanceComponent.tsx/AssetSelectDropDown.tsx)
//      is untouched — those still render their old, larger size wherever
//      `renderMode="legacy"` is still in effect (SponsorPanel/SendPanel,
//      not part of this request).
//   7. 2026-09-13, on request ("can you see how the scale... was shrunk...
//      how can we shrink everything in these panels by 20% more?") — every
//      spacing/icon/dimension value from step 6 scaled down another ×0.8
//      uniformly (e.g. the 70px input is now 56px, the 28px icon is now
//      22px), same method as step 6 itself. Font sizes again got a gentler
//      cut (~0.85-0.9x, e.g. 18px input text -> 16px, 12px labels -> 11px)
//      so text keeps shrinking slower than padding/icons rather than in
//      lockstep — same legibility reasoning as step 6. All ratios between
//      values preserved (e.g. balance-line top / input-height is still
//      ~0.66) so nothing drifts out of alignment relative to the input box
//      around it.
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { CheckCheck, ChevronDown, Copy, Settings } from 'lucide-react';
// 2026-09-13, on request — matches AssetSelectDropDown.tsx's own
// `truncateMiddle` exactly (byte-identical logic, same default sizing:
// TokenSelectDropDown.tsx's own `addrPrePostSize = 4` default —
// "0x94...8631", not the full 42-char address this file was displaying
// verbatim before). Found via real DOM inspection (the user's own
// `outerHTML` dump), not a screenshot guess — the untruncated address was
// the one genuine remaining difference from UNI_SELECT_PANEL's real
// TokenSelectDropDown once a stale `.next/cache` build was ruled out.
// Display-only: CopyAddressButton below still copies the full address.
function truncateMiddle(addr, size = 4) {
    return addr.length > size * 2 + 3 ? `${addr.slice(0, size)}...${addr.slice(-size)}` : addr;
}
// Matches AssetSelectDropDown.tsx's own copy button exactly: a small icon
// button next to the address that flashes a checkmark for 1.5s after a
// successful `navigator.clipboard.writeText`. The real component's `COPY`
// display bit only ever shows once an entity is actually selected (nothing
// to copy otherwise) — same gating here (only rendered when `tokenAddress`
// is set, in the pill markup below). Re-verified directly against its real
// class (`shrink-0 flex items-center justify-center rounded hover:bg-white/10
// p-0.5`): `rounded` (4px) + a `hover:bg-white/10` highlight, needing local
// hover state since inline styles can't express `:hover`.
function CopyAddressButton({ address }) {
    const [copied, setCopied] = useState(false);
    const [hovered, setHovered] = useState(false);
    return (_jsx("button", { type: "button", onClick: (e) => {
            e.preventDefault();
            e.stopPropagation();
            navigator.clipboard.writeText(address).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
            });
        }, onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false), "aria-label": "Copy address", title: "Copy address", style: {
            boxSizing: 'border-box',
            display: 'flex',
            flexShrink: 0,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 2,
            borderRadius: 3,
            border: 'none',
            background: hovered ? 'rgba(255,255,255,0.1)' : 'transparent',
            color: copied ? '#4ade80' : 'inherit',
            cursor: 'pointer',
        }, children: copied ? _jsx(CheckCheck, { size: 12 }) : _jsx(Copy, { size: 12 }) }));
}
// Small local hover-state wrapper — same pattern already used by this
// file's own SwapArrowButton and by PanelTitle.tsx's IconButton. Needed
// here because BalanceComponent.tsx's real click-to-fill span uses Tailwind
// `hover:underline hover:text-slate-300`, which an inline `style` object
// can't express (no `:hover` pseudo-class).
function ClickableBalance({ text, onClick }) {
    const [hovered, setHovered] = useState(false);
    return (_jsx("span", { onClick: onClick, onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false), title: "Click to sell your full balance", style: {
            cursor: 'pointer',
            textDecoration: hovered ? 'underline' : 'none',
            color: hovered ? '#cbd5e1' : undefined,
        }, children: text }));
}
export default function TradeAmountRow({ label, labelColor = '#94a3b8', onCogClick, tokenIcon, tokenSymbol, tokenAddress, showTokenIdentity = true, onTokenPillClick, onIconClick, amount = '0', onAmountChange, amountDisabled, amountNote, balanceText, balanceClickable, onBalanceClick, }) {
    return (
    // Container: matches BaseSelectPanelInner exactly (`relative
    // rounded-[12px] overflow-hidden`) — no background/padding of its own;
    // the input below IS the visible card, everything else overlays it
    // absolutely, same as the real component.
    _jsxs("div", { style: { boxSizing: 'border-box', position: 'relative', borderRadius: 8, overflow: 'hidden' }, children: [_jsxs("div", { style: { boxSizing: 'border-box', position: 'absolute', top: 10, left: 6, minWidth: 32, color: labelColor, fontSize: 11, paddingRight: 5, display: 'flex', alignItems: 'center', gap: 2, zIndex: 1 }, children: [_jsx("span", { style: { whiteSpace: 'nowrap' }, children: label }), onCogClick && (_jsx("button", { type: "button", onClick: onCogClick, "aria-label": "Open slippage settings", title: "Open slippage settings", style: {
                            boxSizing: 'border-box',
                            position: 'relative',
                            top: -6,
                            marginLeft: 2,
                            display: 'flex',
                            flexShrink: 0,
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 11,
                            height: 11,
                            padding: 0,
                            border: 'none',
                            background: 'transparent',
                            color: 'inherit',
                            cursor: 'pointer',
                        }, children: _jsx(Settings, { size: 10 }) }))] }), showTokenIdentity && (_jsxs("div", { style: { boxSizing: 'border-box', position: 'absolute', top: 6, right: 10, minWidth: 32, display: 'flex', alignItems: 'center', gap: 2, zIndex: 1 }, children: [_jsx("span", { onClick: onIconClick, style: {
                            boxSizing: 'border-box',
                            position: 'relative',
                            top: -1,
                            display: 'flex',
                            height: 22,
                            width: 22,
                            flexShrink: 0,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 5,
                            overflow: 'hidden',
                            background: tokenIcon ? 'transparent' : 'rgba(0,0,0,0.2)',
                            cursor: onIconClick ? 'pointer' : 'default',
                        }, children: tokenIcon }), _jsxs("div", { style: { boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0 }, children: [tokenSymbol && (_jsx("span", { style: { fontSize: 11, fontWeight: 600, color: '#ffffff', lineHeight: 1.2, whiteSpace: 'nowrap' }, children: tokenSymbol })), _jsxs("div", { onClick: onTokenPillClick, style: {
                                    boxSizing: 'border-box',
                                    display: 'flex',
                                    height: 16,
                                    alignItems: 'center',
                                    gap: 2,
                                    borderRadius: 9999,
                                    background: '#243056',
                                    padding: '0 5px',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: '#ffffff',
                                    cursor: onTokenPillClick ? 'pointer' : 'default',
                                }, children: [_jsx("span", { style: { whiteSpace: 'nowrap' }, children: tokenAddress ? truncateMiddle(tokenAddress) : 'Select' }), tokenAddress && _jsx(CopyAddressButton, { address: tokenAddress }), onTokenPillClick && _jsx(ChevronDown, { size: 12, style: { flexShrink: 0 } })] })] })] })), _jsx("input", { value: amount, onChange: (e) => onAmountChange?.(e.target.value), disabled: !onAmountChange || amountDisabled, inputMode: "decimal", placeholder: "0", style: {
                    boxSizing: 'border-box',
                    display: 'block',
                    width: '100%',
                    height: 56,
                    textIndent: 6,
                    paddingTop: 6,
                    background: '#1f2639',
                    color: '#94a3b8',
                    fontSize: 16,
                    fontFamily: 'inherit',
                    border: 'none',
                    outline: 'none',
                    borderRadius: '0 0 8px 8px',
                } }), amountNote && (_jsx("div", { style: { boxSizing: 'border-box', position: 'absolute', top: 27, left: 6, fontSize: 9, color: '#64748b', pointerEvents: 'none' }, children: amountNote })), balanceText && (_jsx("div", { style: { boxSizing: 'border-box', position: 'absolute', top: 37, right: 10, minWidth: 32, color: '#94a3b8', fontSize: 11, paddingRight: 5, display: 'flex', alignItems: 'center', gap: 2, zIndex: 1 }, children: balanceClickable && onBalanceClick ? (_jsx(ClickableBalance, { text: balanceText, onClick: onBalanceClick })) : (_jsx("span", { children: balanceText })) }))] }));
}
