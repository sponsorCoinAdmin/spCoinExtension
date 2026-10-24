// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/radioPanelGroups.ts
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt row 7, S2b-4a) -- the radio-group table with its fallbacks and containers, written once.
// It was copied three ways before: the web app's RadioOverlayPanelHost.tsx (the reference, with three adjustments), and MeritWallet.tsx's own
// copy (which lacked the STAKED_SP_COIN_PANEL_MODES fallback, so the extension could drop that group to "nothing visible"). The text below
// is the web app's, unchanged.
import { SP_COIN_DISPLAY, RADIO_PANEL_GROUPS } from '@sponsorcoin/spcoin-common/panels';

// 2026-09-07, on request — "in the WALLET_RADIO_PANELS at least 1 should be
// selected, if none is selected, open TRADING_STATION". RADIO_PANEL_GROUPS
// itself comes from the published @sponsorcoin/spcoin-common package, not
// edited here (its own "0 or 1 visible" groups are documented as
// intentionally allowing 0 — see useEnforceRadioPanelGroups.ts's
// fallbackPanel doc comment) — this local wrapper attaches a fallback only
// to the specific groups below, where "nothing visible" is a real bug
// state, not a valid one.
//
// 2026-09-17, on report ("STAKED_TOKEN_SELECT_DROP_DOWN [not selected] but
// spcoin 0x8b0E...a8FC is still visible, why?") — STAKED_SP_COIN_PANEL_MODES
// joins the list for the same reason. StakingStatusPanel.tsx's token pill
// (the raw activeSpCoinAddress display) is an always-rendered base layer,
// only ever covered by RecipientSelectDropDown when
// STAKED_RECIPIENT_SELECT_DROP_DOWN is visible — so whenever this group
// drops to 0 (e.g. the recipient overlay collapses without anything
// re-selecting it), the raw pill shows through underneath, even though
// nothing in the panel tree marked it as the active member. defaultPanelTree.ts's
// own node comment already documents the intended steady state ("recipient
// wins by default ... so the recipient's own name/logo shows instead of the
// generic spCoin pill") — this fallback is what actually enforces it.
export const RADIO_PANEL_GROUPS_WITH_FALLBACKS = RADIO_PANEL_GROUPS.map((group) => {
  if (group.name === 'MAIN_RADIO_OVERLAY_PANELS') {
    return { ...group, fallbackPanel: SP_COIN_DISPLAY.TRADING_STATION_PANEL };
  }
  // 2026-10-03 — ASSET_RADIO_PANELS' group (its twelve detail panels) is NOT
  // given a fallbackPanel, deliberately, even though it is the obvious "never
  // leave the group empty" shape. All twelve closed is a legitimate state and
  // the container shows an empty body; forcing one open would be worse than
  // showing none. What it DOES get is `container`, enforced by
  // useEnforceRadioPanelContainers below: while 136 is shut, every member of
  // the group is force-closed, so reopening 136 returns an empty container
  // instead of restoring whatever happened to be open before.
  if (group.name === 'ASSET_RADIO_PANELS') {
    return { ...group, container: SP_COIN_DISPLAY.ASSET_RADIO_PANELS };
  }
  // 2026-10-23 (docs/meritFixes.txt §15-16, live report: popping
  // ASSET_SELECT_LIST_PANEL off the display stack left NETWORK_LIST still
  // showing) — same shape as ASSET_RADIO_PANELS above: ACTIVE_LIST_PANEL_MODES'
  // own members (NETWORK_LIST, LOCAL_ACCOUNT_WALLET_LIST, REMOTE_TOKEN_LIST,
  // etc.) were never force-closed when their container closed by some path
  // other than openActiveListPanel's own "open the new mode, close whichever
  // other one was open" step — a stale true then outlived its own container,
  // not just in this component's own rendering (AssetSelectListPanel's
  // activeChild prop is independently immune to that, see
  // useActiveListPanelChild's own doc comment) but in every OTHER direct
  // reader of these six flags (TokenPanel.tsx's tokenListCoversThisPanel
  // gate already had a documented bug from exactly this shape once before).
  if (group.name === 'ACTIVE_LIST_PANEL_MODES') {
    return { ...group, container: SP_COIN_DISPLAY.ASSET_SELECT_LIST_PANEL };
  }
  if (group.name === 'STAKED_SP_COIN_PANEL_MODES') {
    return { ...group, fallbackPanel: SP_COIN_DISPLAY.STAKED_RECIPIENT_SELECT_DROP_DOWN };
  }
  return group;
});

// manageRadioPanels=false's no-op input. Module-level so it is one stable reference across renders: a fresh empty array each render
// would retrigger useEnforceRadioPanelGroups' own useMemo / useEffect for no reason.
export const EMPTY_RADIO_PANEL_GROUPS: typeof RADIO_PANEL_GROUPS_WITH_FALLBACKS = [];
