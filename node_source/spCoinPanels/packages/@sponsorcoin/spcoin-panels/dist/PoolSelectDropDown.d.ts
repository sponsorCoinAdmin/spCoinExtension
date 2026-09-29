import React from 'react';
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
export declare const POOL_SELECT_DISPLAY: {
    readonly ICON: 1;
    readonly ADDRESS: 2;
    readonly SYMBOL: 4;
    readonly NAME: 8;
    readonly CHEVRON_UP: 16;
    readonly CHEVRON_DN: 32;
    readonly COPY: 64;
    readonly ADDR_COMP: 128;
    readonly ADDR_COMP_BLUR: 256;
};
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
declare const PoolSelectDropDown: React.FC<PoolSelectDropDownProps>;
export default PoolSelectDropDown;
