import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { panelStore } from '@sponsorcoin/spcoin-exchange-engine';

export interface EngineVisibility {
  uniSelectVisible: boolean;
  zeroXEngineVisible: boolean;
}

export interface EngineSetters {
  setUniswapEngine(checked: boolean): void;
  setZeroXEngine(checked: boolean): void;
}

let engineSetters: EngineSetters | null = null;

export function registerEngineSetters(setters: EngineSetters): () => void {
  engineSetters = setters;
  return () => {
    if (engineSetters === setters) engineSetters = null;
  };
}

export function getEngineSetters(): EngineSetters | null {
  return engineSetters;
}

export function readEngineVisibility(): EngineVisibility {
  return {
    uniSelectVisible: panelStore.isVisible(SP_COIN_DISPLAY.UNI_SELECT_PANEL),
    zeroXEngineVisible: panelStore.isVisible(SP_COIN_DISPLAY.ZERO_X_SELECT_PANEL),
  };
}

export const ENGINE_PANEL_PAIRS: Record<'uniswap' | 'zeroX', readonly SP_COIN_DISPLAY[]> = {
  uniswap: [SP_COIN_DISPLAY.UNI_SELECT_PANEL, SP_COIN_DISPLAY.UNISWAP_TRADE_BUTTON],
  // The 0X engine's own three panel-tree nodes: the container
  // (ZERO_X_SELECT_PANEL — the engine's primary flag since
  // CONNECT_TRADE_BUTTON was removed from the app 2026-10-05)
  // and its two children. ZERO_X_TOKEN_SELECT_DROP_DOWN moves
  // with the pair (2026-10-05): it is the buy row's token
  // selector, and persisted trees written before the container
  // restructure keep a stale flag forever (repair only seeds
  // ABSENT panels), and the extension's chrome.storage.local
  // survives a browser-localStorage clear — so without this,
  // enabling the 0X engine on a returning install renders the
  // buy row with no token dropdown. ZERO_X_TRADE_BUTTON
  // (2026-10-05, same-day follow-up): the trade/submit button,
  // split out of the since-removed CONNECT_TRADE_BUTTON into
  // its own node — the engine checkbox must move it too, or a
  // returning install whose persisted tree predates the split
  // shows the buy row with no trade button.
  zeroX: [
    SP_COIN_DISPLAY.ZERO_X_SELECT_PANEL,
    SP_COIN_DISPLAY.ZERO_X_TOKEN_SELECT_DROP_DOWN,
    SP_COIN_DISPLAY.ZERO_X_TRADE_BUTTON,
  ],
};
