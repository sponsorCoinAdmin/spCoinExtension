// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/PoolSelectDropDown.tsx
//
// 2026-09-18, moved in from node_source/spCoinPanels/AssetSelectDropDowns/
// (web-app-only glue) into the actual portable package — on request, first
// of the four "real dropdown wrapper" components (Token/Account/Agent/
// Recipient SelectDropDown are the other three, still web-app-only) to make
// this move, since it was already the one genuinely dependency-free of the
// five: no ExchangeContext hooks, no `@/lib/...` imports at all, just
// AssetSelectDropDown + a pool-shaped prop. The only change from its
// original web-app copy is `next/image` -> plain `<img>` (doesn't resolve
// outside a Next.js build — same swap MeritTitleComponent.tsx's own doc
// comment already made for this exact reason). The `/assets/miscellaneous/
// Pool_5.png` src stays a hardcoded absolute path, same as before the move —
// it happens to resolve correctly today because the only real caller
// (PoolManagerCard.tsx) always renders inside the web app's own origin;
// flagged, not fixed, since making it a prop is speculative work with no
// caller asking for it yet (the extension has no pool-management UI at all).

'use client';

import React from 'react';
import AssetSelectDropDown, { ASSET_SELECT_DISPLAY } from './AssetSelectDropDown';

/** Poolable-side shape — just enough of a token to identify it and draw its logo (see PoolManagerCard.tsx's OwnedPositionInfo for the real caller). */
export interface PoolSelectToken {
  address?: string;
  symbol?: string;
  name?: string;
  logoURL?: string;
}

export interface PoolSelectEntity {
  /** The pool contract's own address — shown in full elsewhere (PoolManagerCard.tsx's own "Pool: 0x..." subtitle) and surfaced here only as the address slot's hover title, not what actually renders/copies in it — see positionId below and the component's own doc comment. */
  poolAddress: string;
  tokenA: PoolSelectToken;
  tokenB: PoolSelectToken;
  /**
   * The LP position NFT's token ID (e.g. "5645363") — what actually
   * renders/copies in the address slot whenever a pool is loaded (see the
   * component's own doc comment).
   */
  positionId?: string;
}

/** Re-exported under this name for callers that only ever use it for pools — same bit values as every other *_SELECT_DISPLAY alias (ACCOUNT_SELECT_DISPLAY, NETWORK_SELECT_DISPLAY). */
export const POOL_SELECT_DISPLAY = ASSET_SELECT_DISPLAY;

export interface PoolSelectDropDownProps {
  pool?: PoolSelectEntity;
  /** Row click — no default "open a picker" behavior exists for this one (there's no pool-list feed the way accounts/tokens have), so this is the only way anything happens on click. */
  onSelectClick?: (e: React.SyntheticEvent) => void;
  /** Fallback label shown (before ": ") when no pool is selected yet. */
  label?: string;
  /** Bitmask (see POOL_SELECT_DISPLAY) controlling which sub-elements render. Defaults to icon+symbol+name+address+chevron+copy+pill, same look AccountSelectDropDown/TokenSelectDropDown default to. */
  showDisplay?: number;
  /**
   * Chars kept before/after the "..." filler for the pool address (see
   * AssetSelectDropDown). Defaults to 4 — matches AccountSelectDropDown's
   * own default, not AssetSelectDropDown's own (full-address) default.
   */
  addrPrePostSize?: number;
  /** Forwarded to AssetSelectDropDown — see its own doc comment. */
  collapseKey?: unknown;
  /**
   * Forwarded to AssetSelectDropDown — see its own doc comment. Set this
   * when onSelectClick is a toggle (open/close some section, as opposed to
   * "go pick something") — without it, the whole pill (icon, symbol/name
   * text) fires onSelectClick too, so clicking anywhere in it toggles the
   * section shut again just as easily as the chevron itself does, which
   * reads as accidental/unpredictable rather than a deliberate open/close
   * control.
   */
  restrictRowClickToChevron?: boolean;
}

/**
 * "Select Pool" trigger pill, built on AssetSelectDropDown the same way
 * AccountSelectDropDown/TokenSelectDropDown are — but a pool isn't a token
 * or an account, so the field mapping is deliberately different, AND
 * state-dependent on whether the list this trigger opens is currently open
 * (derived from the CHEVRON_UP/CHEVRON_DN bits the caller passes via
 * showDisplay — CHEVRON_UP means "open," matching PoolManagerCard's own
 * `isPositionListOpen ? CHEVRON_UP : CHEVRON_DN` convention):
 *   - symbol/name slot -> nothing at all (the whole "$symbol | $name" row
 *                     doesn't render) while CLOSED — a collapsed trigger
 *                     stays minimal (icon + position ID only), no trading-
 *                     pair text cluttering it. While OPEN: tokenB.symbol |
 *                     tokenA.symbol — a trading-pair-style label (e.g.
 *                     "SPCOIN_V1 | WETH" — the project's own token first,
 *                     not token0/token1's numeric-address ordering), shown
 *                     only for the moment someone's actually
 *                     choosing/reviewing, not permanently.
 *   - address slot -> positionId (the LP position's own token ID, e.g.
 *                     "5645363") when a pool is actually loaded, else the
 *                     placeholder label ("Select Pool"). NOT poolAddress —
 *                     that's one fixed value shared by every position in
 *                     the pool, so it doesn't distinguish rows; still
 *                     surfaced on this slot's hover title for reference,
 *                     and shown in full elsewhere (PoolManagerCard's own
 *                     "Pool: 0x..." subtitle).
 *   - icon slot    -> the generic Pool_5.png badge
 *                     (public/assets/miscellaneous/Pool_5.png), unaffected
 *                     by open/closed state.
 *
 * No default click behavior (unlike AccountSelectDropDown/TokenSelectDropDown,
 * which open a REMOTE_*_LIST picker when onSelectClick is omitted) — there's
 * no equivalent generic "browse all pools" feed in this app, so a caller
 * always has to supply its own onSelectClick (e.g. PoolManagerCard's
 * "Pools" list, where each row IS the pool being picked).
 */
const PoolSelectDropDown: React.FC<PoolSelectDropDownProps> = ({
  pool,
  onSelectClick,
  label = 'Select Pool',
  showDisplay,
  addrPrePostSize = 4,
  collapseKey,
  restrictRowClickToChevron,
}) => {
  const poolAddress = String(pool?.poolAddress ?? '');
  // What actually renders/copies in the address slot — see the doc comment above.
  const positionIdDisplay = String(pool?.positionId ?? '');

  const resolvedShowDisplay =
    showDisplay ??
    (POOL_SELECT_DISPLAY.ICON |
      POOL_SELECT_DISPLAY.SYMBOL |
      POOL_SELECT_DISPLAY.NAME |
      POOL_SELECT_DISPLAY.ADDRESS |
      POOL_SELECT_DISPLAY.CHEVRON_DN |
      POOL_SELECT_DISPLAY.COPY |
      POOL_SELECT_DISPLAY.ADDR_COMP);

  // CHEVRON_UP is this component's own "the list is open" signal — see the
  // doc comment above on why the symbol/name row depends on it. Only
  // meaningful for a caller that actually toggles CHEVRON_UP/CHEVRON_DN
  // (the main trigger pill, e.g. PoolManagerCard's "Pools" trigger) — a
  // caller with NEITHER bit set (list rows: each row already IS the
  // selection, they don't have their own open/closed state, e.g.
  // PoolManagerCard's owned-positions list) defaults to showing the label,
  // same as before this open/closed behavior existed at all.
  const hasChevronBit = !!(resolvedShowDisplay & (POOL_SELECT_DISPLAY.CHEVRON_UP | POOL_SELECT_DISPLAY.CHEVRON_DN));
  const isOpen = hasChevronBit ? !!(resolvedShowDisplay & POOL_SELECT_DISPLAY.CHEVRON_UP) : true;

  return (
    <AssetSelectDropDown
      rootId="POOL_SELECT_DROP_DOWN"
      hasEntity={!!pool}
      icon={
        pool ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/assets/miscellaneous/Pool_5.png"
            alt={`${pool.tokenA.symbol ?? 'TokenA'} / ${pool.tokenB.symbol ?? 'TokenB'} pool`}
            title={`${pool.tokenA.symbol ?? 'TokenA'} / ${pool.tokenB.symbol ?? 'TokenB'} pool`}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        ) : undefined
      }
      symbol={isOpen ? pool?.tokenB.symbol : undefined}
      name={isOpen ? pool?.tokenA.symbol : undefined}
      address={positionIdDisplay}
      addressTitle={pool ? `Pool contract: ${poolAddress}` : undefined}
      placeholderLabel={label}
      copyLabel="Copy position ID"
      // Standard AssetSelectDropDown icon size (40px, same as
      // TokenSelectDropDown and every other unmodified consumer) — was
      // bumped up twice (+25%, then +20% more, to 60px) before being
      // reverted back to the shared default here; no iconSizeClassName
      // override at all now.
      showDisplay={resolvedShowDisplay}
      onRowClick={onSelectClick}
      addrPrePostSize={addrPrePostSize}
      collapseKey={collapseKey}
      restrictRowClickToChevron={restrictRowClickToChevron}
    />
  );
};

export default PoolSelectDropDown;
