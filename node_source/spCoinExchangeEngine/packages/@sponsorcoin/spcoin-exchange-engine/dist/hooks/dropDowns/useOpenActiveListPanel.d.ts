import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { type ActiveListPanelParams } from './activeListPanelStore';
/**
 * Opens the single, parameterized ACTIVE_LIST_PANEL: stashes the params the
 * panel will read on render, then flips ASSET_LIST_SELECT_PANEL + ACTIVE_LIST_PANEL
 * visible together (same "open container + specific child" pattern used
 * elsewhere in the panel tree).
 *
 * `mode` is an optional child flag to open alongside ACTIVE_LIST_PANEL (e.g.
 * SP_COIN_DISPLAY.REMOTE_TOKEN_LIST) — a purely symbolic, display-only marker. It
 * does not drive any behavior itself — the actual feed/commit/title come
 * from `params`.
 */
export declare function useOpenActiveListPanel(): {
    openActiveListPanel: (params: ActiveListPanelParams, invoker: string, mode?: SP_COIN_DISPLAY) => void;
    closeActiveListPanel: (invoker: string) => void;
};
