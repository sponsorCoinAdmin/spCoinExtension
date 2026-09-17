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

import React, { useState } from 'react';
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
function truncateMiddle(addr: string, size = 4): string {
  return addr.length > size * 2 + 3 ? `${addr.slice(0, size)}...${addr.slice(-size)}` : addr;
}

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
  /** Omit for an inert pill (today's default) — provide to open a token
   *  picker, matching TokenSelectDropDown.tsx's real row-click behavior. */
  onTokenPillClick?: (e: React.SyntheticEvent) => void;
  // 2026-09-16, on live report/correction ("that was not where the account
  // panel should be opened... it should have been opened... in 'New
  // Recipient Staked spCoins'... when the avatar.png was clicked in the
  // container in the component RecipientSelectDropDown") — this row IS
  // that trigger pill (the already-picked entity's own icon+symbol+address
  // display), same "icon opens details, rest of the trigger opens the
  // picker" split every other trigger in this package has (WalletAccountHeader's
  // avatar, NetworkSelectDropDown's logo) — a genuinely different place
  // from the earlier (reverted) attempt, which wired this onto the LIST
  // rows you pick FROM instead of the trigger pill showing what's already
  // picked. Omit for no separate icon action (today's default — the icon
  // is purely decorative until a caller wires this).
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

// Matches AssetSelectDropDown.tsx's own copy button exactly: a small icon
// button next to the address that flashes a checkmark for 1.5s after a
// successful `navigator.clipboard.writeText`. The real component's `COPY`
// display bit only ever shows once an entity is actually selected (nothing
// to copy otherwise) — same gating here (only rendered when `tokenAddress`
// is set, in the pill markup below). Re-verified directly against its real
// class (`shrink-0 flex items-center justify-center rounded hover:bg-white/10
// p-0.5`): `rounded` (4px) + a `hover:bg-white/10` highlight, needing local
// hover state since inline styles can't express `:hover`.
function CopyAddressButton({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        navigator.clipboard.writeText(address).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label="Copy address"
      title="Copy address"
      style={{
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
      }}
    >
      {copied ? <CheckCheck size={12} /> : <Copy size={12} />}
    </button>
  );
}

// Small local hover-state wrapper — same pattern already used by this
// file's own SwapArrowButton and by PanelTitle.tsx's IconButton. Needed
// here because BalanceComponent.tsx's real click-to-fill span uses Tailwind
// `hover:underline hover:text-slate-300`, which an inline `style` object
// can't express (no `:hover` pseudo-class).
function ClickableBalance({ text, onClick }: { text: string; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <span
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title="Click to sell your full balance"
      style={{
        cursor: 'pointer',
        textDecoration: hovered ? 'underline' : 'none',
        color: hovered ? '#cbd5e1' : undefined,
      }}
    >
      {text}
    </span>
  );
}

export default function TradeAmountRow({
  label,
  labelColor = '#94a3b8',
  onCogClick,
  tokenIcon,
  tokenSymbol,
  tokenAddress,
  onTokenPillClick,
  onIconClick,
  amount = '0',
  onAmountChange,
  amountDisabled,
  amountNote,
  balanceText,
  balanceClickable,
  onBalanceClick,
}: TradeAmountRowProps) {
  return (
    // Container: matches BaseSelectPanelInner exactly (`relative
    // rounded-[12px] overflow-hidden`) — no background/padding of its own;
    // the input below IS the visible card, everything else overlays it
    // absolutely, same as the real component.
    <div style={{ boxSizing: 'border-box', position: 'relative', borderRadius: 8, overflow: 'hidden' }}>
      {/* Label — scaled down another 20% from step 6 (see file header,
          point 7). */}
      <div style={{ boxSizing: 'border-box', position: 'absolute', top: 10, left: 6, minWidth: 32, color: labelColor, fontSize: 11, paddingRight: 5, display: 'flex', alignItems: 'center', gap: 2, zIndex: 1 }}>
        <span style={{ whiteSpace: 'nowrap' }}>{label}</span>
        {onCogClick && (
          <button
            type="button"
            onClick={onCogClick}
            aria-label="Open slippage settings"
            title="Open slippage settings"
            style={{
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
            }}
          >
            <Settings size={10} />
          </button>
        )}
      </div>

      {/* Token pill — same shape as before (icon, symbol, address pill with
          copy+chevron), scaled down another 20% from step 6 (see file
          header, point 7). Icon stays `rounded-lg` (a square, not a
          circle) — that shape match is unrelated to the sizing pass and
          stays as-is. */}
      <div style={{ boxSizing: 'border-box', position: 'absolute', top: 6, right: 10, minWidth: 32, display: 'flex', alignItems: 'center', gap: 2, zIndex: 1 }}>
        <span
          onClick={onIconClick}
          style={{
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
          }}
        >
          {tokenIcon}
        </span>
        <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0 }}>
          {tokenSymbol && (
            <span style={{ fontSize: 11, fontWeight: 600, color: '#ffffff', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
              {tokenSymbol}
            </span>
          )}
          <div
            onClick={onTokenPillClick}
            style={{
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
            }}
          >
            <span style={{ whiteSpace: 'nowrap' }}>{tokenAddress ? truncateMiddle(tokenAddress) : 'Select'}</span>
            {tokenAddress && <CopyAddressButton address={tokenAddress} />}
            <ChevronDown size={12} style={{ flexShrink: 0 }} />
          </div>
        </div>
      </div>

      {/* Amount — scaled down another 20% from step 6 (see file header,
          point 7). Still always an `<input>` (disabled when no handler)
          rather than a plain `<div>`. */}
      <input
        value={amount}
        onChange={(e) => onAmountChange?.(e.target.value)}
        disabled={!onAmountChange || amountDisabled}
        inputMode="decimal"
        placeholder="0"
        style={{
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
        }}
      />

      {/* Optional route note (e.g. UNI_SELECT_PANEL's real
          "multihop using weth", `text-xs text-slate-500`) — sits just under
          the amount's own text baseline, above the balance line below. */}
      {amountNote && (
        <div style={{ boxSizing: 'border-box', position: 'absolute', top: 27, left: 6, fontSize: 9, color: '#64748b', pointerEvents: 'none' }}>
          {amountNote}
        </div>
      )}

      {/* Balance — scaled down another 20% from step 6 (see file header,
          point 7). */}
      {balanceText && (
        <div style={{ boxSizing: 'border-box', position: 'absolute', top: 37, right: 10, minWidth: 32, color: '#94a3b8', fontSize: 11, paddingRight: 5, display: 'flex', alignItems: 'center', gap: 2, zIndex: 1 }}>
          {balanceClickable && onBalanceClick ? (
            <ClickableBalance text={balanceText} onClick={onBalanceClick} />
          ) : (
            <span>{balanceText}</span>
          )}
        </div>
      )}
    </div>
  );
}
