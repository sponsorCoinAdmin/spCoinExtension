// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/receipt/useTransactionReceipt.ts
//
// 2026-10-09 -- show a result card: write the message into the exchange context and open MESSAGE_PANEL, the same two steps the web app's send / stake / swap
// handlers take. The wallet component calls it with what buildSendReceipt / buildStakeReceipt return.
'use client';

import { useCallback } from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import type { ErrorMessage } from '@sponsorcoin/spcoin-common/context';
import { balancesChangedStore, useExchangeContext, usePanelTree } from '@sponsorcoin/spcoin-exchange-engine';

export function useTransactionReceipt(): (message: ErrorMessage, invoker: string) => void {
  const { setErrorMessage } = useExchangeContext();
  const { openPanel } = usePanelTree();
  return useCallback(
    (message, invoker) => {
      setErrorMessage(message);
      openPanel(SP_COIN_DISPLAY.MESSAGE_PANEL, invoker);
      // A receipt follows a confirmed write: every balance row re-reads now (2026-10-10: the balances used to stay stale until the page was reloaded).
      balancesChangedStore.bump();
    },
    [setErrorMessage, openPanel],
  );
}
