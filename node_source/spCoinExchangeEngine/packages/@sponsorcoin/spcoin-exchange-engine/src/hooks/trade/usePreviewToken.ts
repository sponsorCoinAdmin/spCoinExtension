// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/hooks/trade/usePreviewToken.ts
// 2026-09-25, migrated from spcoin-nextjs-front-end's
// lib/context/hooks/nestedHooks/useTokenContracts.ts (on request, "do
// issue 2" — TokenLogo's dependency chain). Genuinely portable — thin
// wrappers over useExchangeContext, already moved into this same package.
// usePreviewTokenContract's own dedupe check (tokenContractsEqual) is kept
// — a real correctness piece (skips a redundant context write/re-render
// when the value hasn't actually changed), not debug-only — reusing the
// package's own already-portable copy
// (hooks/dropDowns/tokenContractsEqual.ts, moved 2026-09-21) rather than
// re-porting it. Only web-app-only debug logging (debugHookChange/tLog)
// dropped, same convention as every other hook moved into this package.
import type { TokenContract } from '@sponsorcoin/spcoin-common/context';
import { useExchangeContext } from '../useExchangeContext';
import { tokenContractsEqual } from '../dropDowns/tokenContractsEqual';

export const usePreviewTokenContract = (): [
  TokenContract | undefined,
  (contract: TokenContract | undefined) => void,
] => {
  const { exchangeContext, setExchangeContext } = useExchangeContext();
  const token = (exchangeContext as any)?.apiCoreSyncedMembers?.tradeData?.previewTokenContract;

  const setToken = (contract: TokenContract | undefined) => {
    const prev = (exchangeContext as any)?.apiCoreSyncedMembers?.tradeData?.previewTokenContract;
    if (tokenContractsEqual(prev, contract)) return;

    setExchangeContext((p: any) => ({
      ...p,
      apiCoreSyncedMembers: {
        ...p.apiCoreSyncedMembers,
        tradeData: {
          ...p.apiCoreSyncedMembers.tradeData,
          previewTokenContract: contract,
        },
      },
    }));
  };

  return [token, setToken];
};

export const usePreviewTokenSource = (): [
  'BUY' | 'SELL' | null | undefined,
  (source: 'BUY' | 'SELL' | null) => void,
] => {
  const { exchangeContext, setExchangeContext } = useExchangeContext();
  const source = (exchangeContext as any)?.apiCoreSyncedMembers?.tradeData?.previewTokenSource;

  const setSource = (nextSource: 'BUY' | 'SELL' | null) => {
    const prev = (exchangeContext as any)?.apiCoreSyncedMembers?.tradeData?.previewTokenSource ?? null;
    if (prev === nextSource) return;

    setExchangeContext((p: any) => ({
      ...p,
      apiCoreSyncedMembers: {
        ...p.apiCoreSyncedMembers,
        tradeData: {
          ...p.apiCoreSyncedMembers.tradeData,
          previewTokenSource: nextSource,
        },
      },
    }));
  };

  return [source, setSource];
};
