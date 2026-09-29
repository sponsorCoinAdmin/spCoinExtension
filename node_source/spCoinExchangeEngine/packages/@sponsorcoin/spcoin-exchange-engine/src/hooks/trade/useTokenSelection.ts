// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/hooks/trade/useTokenSelection.ts
// 2026-09-25, migrated from spcoin-nextjs-front-end's
// lib/hooks/trade/useTokenSelection.ts (on request, "migrate them").
// Genuinely portable — depends only on SP_COIN_DISPLAY (already shared via
// @sponsorcoin/spcoin-common/panels) and plain React state/refs. Web-app-only
// debug logging dropped on the move, same convention as every other hook
// moved into this package so far.
import { useEffect, useMemo, useRef } from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';

// Matches viem's own `Address` type exactly (\`0x${string}\`) without
// importing viem itself — this package's CJS/node16 moduleResolution
// can't cleanly consume viem's type-only exports as a static import from
// a CJS file (TS1541: "must have a resolution-mode attribute").
type Address = `0x${string}`;

const lower = (addr?: string | Address) =>
  addr ? (addr as string).toLowerCase() : '';

interface Params {
  containerType: SP_COIN_DISPLAY;
  sellTokenContract: any;
  buyTokenContract: any;
  setLocalTokenContract: (t: any) => void;
  setLocalAmount: (a: bigint) => void;
  sellAmount: bigint;
  buyAmount: bigint;
  setSellAmount: (a: bigint) => void;
  setBuyAmount: (a: bigint) => void;
}

export function useTokenSelection({
  containerType,
  sellTokenContract,
  buyTokenContract,
  setLocalTokenContract,
  setLocalAmount,
  sellAmount,
  buyAmount,
  setSellAmount,
  setBuyAmount,
}: Params) {
  const isSellPanel =
    containerType === SP_COIN_DISPLAY.SELL_SELECT_PANEL ||
    containerType === SP_COIN_DISPLAY.ASSET_LIST_SELECT_PANEL;

  const tokenContract = isSellPanel ? sellTokenContract : buyTokenContract;

  const tokenAddr = useMemo(
    () => lower(tokenContract?.address),
    [tokenContract?.address],
  );
  const tokenDecimals = tokenContract?.decimals ?? 18;

  // Mirror address changes into local state
  const prevAddrRef = useRef<string>('');
  useEffect(() => {
    if (!tokenAddr && !prevAddrRef.current) return;
    if (tokenAddr === prevAddrRef.current) return;
    prevAddrRef.current = tokenAddr || '';

    if (tokenAddr) {
      setLocalTokenContract(tokenContract as any);
    }
  }, [tokenAddr, containerType, setLocalTokenContract, tokenContract]);

  // Zero state when cleared
  const wasDefinedRef = useRef<boolean>(Boolean(tokenAddr));
  useEffect(() => {
    const wasDefined = wasDefinedRef.current;
    const isDefined = Boolean(tokenAddr);
    if (wasDefined && !isDefined) {
      setLocalTokenContract(undefined as any);
      setLocalAmount(BigInt(0));
      if (isSellPanel) {
        if (sellAmount !== BigInt(0)) setSellAmount(BigInt(0));
      } else {
        if (buyAmount !== BigInt(0)) setBuyAmount(BigInt(0));
      }
    }
    wasDefinedRef.current = isDefined;
  }, [
    tokenAddr,
    containerType,
    isSellPanel,
    setLocalTokenContract,
    setLocalAmount,
    sellAmount,
    buyAmount,
    setSellAmount,
    setBuyAmount,
  ]);

  return { tokenContract, tokenAddr, tokenDecimals };
}
