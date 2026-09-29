// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/hooks/trade/useSponsorMode.ts
//
// 2026-09-25, moved from the parent app's
// lib/context/exchangeContext/hooks/useSponsorMode.ts (on request,
// "migrate useSponsorMode").
//
// Portability: the two module-singleton stores (sponsorModeStore /
// sponsorSwapStore, same directory) are plain pub-sub singletons — zero
// web-app coupling, each consumer gets its own instance. useSellTokenContract
// is already portable (moved to this package 2026-09-21). The ONLY
// non-portable dependency, isSpCoin (build-time deployment-map + CHAIN_ID
// lookup, deeply rooted in the web app's lib/spCoin/coreUtils.ts), is
// injected as an optional parameter so each consumer supplies its own:
// the web app passes its real isSpCoin (via the re-export shim at
// lib/context/exchangeContext/hooks/useSponsorMode.ts); a bare consumer
// (extension) defaults to () => false → never auto-derives STAKE mode, which
// is correct today since extension spCoin staking is Phase C.
//
// Web-app-only debug logging (createDebugLogger / debugHookChange) dropped
// on the move, same convention as every other hook moved into this package.

import { useCallback, useSyncExternalStore } from 'react';
import type { TokenContract } from '@sponsorcoin/spcoin-common/context';
import { useSellTokenContract } from '../dropDowns/useSellTokenContract';
import { sponsorSwapStore } from './sponsorSwapStore';
import { sponsorModeStore } from './sponsorModeStore';

export type SponsorMode = 'SPONSOR' | 'STAKE' | 'REVOKE';

const noopIsSpCoin = (_: TokenContract | undefined): boolean => false;

export function useSponsorMode(
  isSpCoinCheck: (token: TokenContract | undefined) => boolean = noopIsSpCoin,
): { mode: SponsorMode; setMode: (m: SponsorMode) => void } {
  const storedMode = useSyncExternalStore(
    sponsorModeStore.subscribe,
    sponsorModeStore.getSnapshot,
    sponsorModeStore.getServerSnapshot,
  );
  const swapped = useSyncExternalStore(
    sponsorSwapStore.subscribe,
    sponsorSwapStore.getSnapshot,
    sponsorSwapStore.getServerSnapshot,
  );
  const [sellTokenContract] = useSellTokenContract();

  const mode: SponsorMode = swapped
    ? 'REVOKE'
    : isSpCoinCheck(sellTokenContract)
    ? 'STAKE'
    : storedMode === 'REVOKE'
    ? 'SPONSOR'
    : storedMode;

  const setMode = useCallback(
    (newMode: SponsorMode) => {
      sponsorModeStore.set(newMode);

      if (newMode === 'REVOKE') {
        if (!swapped) sponsorSwapStore.toggle();
        return;
      }

      if (swapped) sponsorSwapStore.toggle();
    },
    [swapped],
  );

  return { mode, setMode };
}
