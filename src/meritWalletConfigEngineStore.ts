import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { panelStore } from '@sponsorcoin/spcoin-exchange-engine';

export interface EngineVisibility {
  uniSelectVisible: boolean;
  connectTradeButtonVisible: boolean;
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
    connectTradeButtonVisible: panelStore.isVisible(SP_COIN_DISPLAY.CONNECT_TRADE_BUTTON),
  };
}

export const ENGINE_PANEL_PAIRS: Record<'uniswap' | 'zeroX', readonly SP_COIN_DISPLAY[]> = {
  uniswap: [SP_COIN_DISPLAY.UNI_SELECT_PANEL, SP_COIN_DISPLAY.UNISWAP_TRADE_BUTTON],
  zeroX: [SP_COIN_DISPLAY.CONNECT_TRADE_BUTTON, SP_COIN_DISPLAY.ZERO_X_SELECT_PANEL],
};
