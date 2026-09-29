// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/hooks/trade/useDebounce.ts
// 2026-09-25, migrated from spcoin-nextjs-front-end's lib/hooks/useDebounce.ts
// (on request, "migrate them"). Generic, zero real coupling — the
// web-app-only debug logging that file carried is dropped on the move,
// matching every other hook already moved into this package (see
// hooks/dropDowns/useSellTokenContract.ts's own header comment for the
// same convention).
import { useEffect, useState } from 'react';

const defaultMilliSeconds = 600;

export const useDebounce = <T>(value: T, delay: number = defaultMilliSeconds): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    if (value === debouncedValue) return;

    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay, debouncedValue]);

  return debouncedValue;
};
