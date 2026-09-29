// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/hooks/dropDowns/activeListPanelStore.ts
//
// 2026-09-18 — moved from the parent app's
// lib/context/exchangeContext/activeListPanelStore.ts (panel-tree
// migration follow-up, "stage 9c" — see docs/npmMigrationDesign.md).
// Unblocked by two things landing earlier the same day: the panel-tree
// runtime itself (stage 9) and FEED_TYPE joining STATUS/TRADE_DIRECTION as
// a @sponsorcoin/spcoin-common export (this file's only real dependency
// beyond already-portable spCoinAccount/TokenContract types). No coupling
// found — content unchanged.
'use client';

import { FEED_TYPE, type spCoinAccount, type TokenContract } from '@sponsorcoin/spcoin-common/context';

export interface ActiveListPanelParams {
  /** Which feed to fetch/display (see useFeedData). Also determines the panel title — see getPanelTitle. */
  feedType: FEED_TYPE;
  /** Invoked with the selected asset when a row is picked. */
  onCommit: (asset: spCoinAccount | TokenContract) => void;
  /** The opposite side's already-committed address, for duplicate-selection checks. */
  peerAddress?: string;
  /** Overrides getPanelTitle(feedType) — used by the tree-only fallback params to label itself. */
  title?: string;
  /**
   * True only for the tree-only fallback params (see useActiveListPanelParams)
   * — the panel became visible some other way than a real opener call
   * (openActiveListPanel), most commonly by toggling its flag directly in
   * the Test page's Exchange Context panel-tree inspector. Drives the
   * "(From Panel Tree)" title badge; a real chevron/button click always
   * goes through a real opener and never sets this.
   */
  fromPanelTree?: boolean;
  /**
   * True when this list was opened by a selector dropdown (AccountSelectDropDown /
   * TokenSelectDropDown / TokenAddressComponent, etc.) whose entire job is to
   * pick a value and return it to the caller via onCommit. When set, clicking
   * a row's logo commits that row (same as clicking the row body) instead of
   * the row's normal default of opening the entity's own detail panel — the
   * "calling parent... allows the list to return the asset back to the
   * calling program" override. Omit for browse/manage-style lists, where the
   * logo's default (open the detail panel) is what's wanted.
   */
  selectOnLogoClick?: boolean;
  /**
   * Free-form tag identifying which specific opener requested this list —
   * distinct from `feedType`, which is shared across multiple unrelated
   * openers (e.g. FEED_TYPE.REMOTE_TOKEN_LIST is used both by the wallet's
   * generic Swap/Buy/Sell token select AND by SponsorCoinLab's own
   * "Contract Address" picker). A consumer that needs to react ONLY to its
   * own trigger — not every opener sharing its feedType — must check this,
   * not just feedType/visibility flags (see TokenListOverlay.tsx, which
   * used to pop up any time the *wallet's* token picker opened too).
   */
  origin?: string;
  /**
   * Gate run before a pick (list row click OR manual/typed address entry)
   * actually commits — see validateAccount.ts. Returning { ok: false } shows
   * `message` in RoleAccountValidationPopup and leaves the list open/the
   * selection uncommitted instead of closing (see DataListSelect.tsx's two
   * commit sites and useFSMBridge.ts's RETURN_VALIDATED_ASSET handling,
   * the only two places a pick actually commits). Omit for feeds with no
   * such rule (tokens, browse-only account lists).
   */
  validateSelection?: (address: string) => { ok: boolean; message?: string };
  /**
   * This field's own current value before the picker opened — shown as an
   * icon badge in the picker's own header (see TokenListOverlay.tsx's left
   * icon), same "active entity, top-left of the header" spot NetworkSelectionPopup.tsx/
   * WalletHeader's selection mode use for the active network/account. Token
   * feeds only in practice (TokenAddressSelectField.tsx); omit for feeds
   * with no meaningful "current" value to badge.
   */
  currentTokenAddress?: string;
  currentTokenChainId?: number;
  currentTokenSymbol?: string;
  currentTokenName?: string;
}

/**
 * The PANEL_TITLE banner text for a given feed — describes what's
 * IN the list, not the transactional role (e.g. sell vs buy show the same
 * title since they show the same token list; the trading-pair labels already
 * convey which side you're picking for).
 */
export function getPanelTitle(feedType: FEED_TYPE): string {
  switch (feedType) {
    case FEED_TYPE.REMOTE_TOKEN_LIST:
      return 'Select a Token';
    case FEED_TYPE.REMOTE_SPONSOR_ACCOUNTS:
      return 'Select Sponsor';
    case FEED_TYPE.REMOTE_RECIPIENT_ACCOUNTS:
      return 'Select Recipient';
    case FEED_TYPE.REMOTE_AGENT_ACCOUNTS:
      return 'Select Agent';
    case FEED_TYPE.REMOTE_ACCOUNT_SEND_LIST:
      return 'Browse Accounts';
    case FEED_TYPE.MANAGE_RECIPIENTS:
      return 'Manage Recipients';
    case FEED_TYPE.MANAGE_AGENTS:
      return 'Manage Agents';
    default:
      return 'Select an Asset';
  }
}

type Listener = () => void;

class ActiveListPanelStore {
  private params: ActiveListPanelParams | null = null;
  private listeners = new Set<Listener>();

  get = (): ActiveListPanelParams | null => this.params;

  set = (params: ActiveListPanelParams) => {
    this.params = params;
    for (const fn of Array.from(this.listeners)) fn();
  };

  clear = () => {
    if (this.params === null) return;
    this.params = null;
    for (const fn of Array.from(this.listeners)) fn();
  };

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
}

export const activeListPanelStore = new ActiveListPanelStore();
