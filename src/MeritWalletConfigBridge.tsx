import { useEffect } from 'react';
import { useExchangeEngineSync } from '@sponsorcoin/spcoin-exchange-engine';
import { registerEngineSetters } from './meritWalletConfigEngineStore';

export interface MeritWalletConfigBridgeProps {
  onEngineVisibilityChange: () => void;
}

export function MeritWalletConfigBridge({ onEngineVisibilityChange }: MeritWalletConfigBridgeProps) {
  // docs/meritMigration.txt row 38: which panels an engine toggle turns on and off is the engine's useExchangeEngineSync, the same hook the web's Config tab uses (this file used to keep its own list of the panel pairs)
  const { applyUniswapEngine, apply0xEngine } = useExchangeEngineSync();

  useEffect(() => {
    return registerEngineSetters({
      setUniswapEngine: (checked) => { applyUniswapEngine(checked, 'WalletConfig:uniswapEngineChange'); onEngineVisibilityChange(); },
      setZeroXEngine: (checked) => { apply0xEngine(checked, 'WalletConfig:zeroXEngineChange'); onEngineVisibilityChange(); },
    });
  }, [applyUniswapEngine, apply0xEngine, onEngineVisibilityChange]);

  return null;
}
