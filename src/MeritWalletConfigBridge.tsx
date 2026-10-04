import { useEffect } from 'react';
import { useSetPanelVisible } from '@sponsorcoin/spcoin-exchange-engine';
import { ENGINE_PANEL_PAIRS, registerEngineSetters } from './meritWalletConfigEngineStore';

export interface MeritWalletConfigBridgeProps {
  onEngineVisibilityChange: () => void;
}

export function MeritWalletConfigBridge({ onEngineVisibilityChange }: MeritWalletConfigBridgeProps) {
  const setPanelVisible = useSetPanelVisible();

  useEffect(() => {
    const apply = (engine: keyof typeof ENGINE_PANEL_PAIRS, checked: boolean) => {
      for (const panel of ENGINE_PANEL_PAIRS[engine]) {
        setPanelVisible(panel, checked, `WalletConfig:${engine}EngineChange`);
      }
      onEngineVisibilityChange();
    };

    return registerEngineSetters({
      setUniswapEngine: (checked) => apply('uniswap', checked),
      setZeroXEngine: (checked) => apply('zeroX', checked),
    });
  }, [setPanelVisible, onEngineVisibilityChange]);

  return null;
}
