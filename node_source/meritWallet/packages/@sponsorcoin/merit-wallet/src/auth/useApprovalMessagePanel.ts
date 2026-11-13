// File: src/auth/useApprovalMessagePanel.ts
//
// 2026-10-14 (owner request): "Waiting for MetaMask to approve connecting this site" and how the request ended ("MetaMask did not approve: User rejected the request.") are shown in MESSAGE_PANEL (the wallet's
// one message page), not as a floating line over the wallet. While a request is open the panel says who is deciding; when it ends in a refusal or a failure it says so and stays until it is closed; when the
// request is approved the panel this hook opened closes again. MESSAGE_PANEL is only closed here when this hook is what put the message there.
'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { STATUS } from '@sponsorcoin/spcoin-common/context';
import { useExchangeContext, usePanelTree, usePanelVisible } from '@sponsorcoin/spcoin-exchange-engine';
import { approvalWaiting, approvalWaitingText, type ApprovalWaitingStore } from './approvalWaiting';

const SOURCE = 'ApprovalWaiting';

export function useApprovalMessagePanel(store: ApprovalWaitingStore = approvalWaiting): void {
  const pending = useSyncExternalStore(store.subscribe, store.getState, store.getState);
  const outcome = useSyncExternalStore(store.subscribe, store.getOutcome, store.getOutcome);
  const { exchangeContext, setErrorMessage } = useExchangeContext();
  const { openPanel, closePanel } = usePanelTree();
  // 2026-11-13 (owner: "remove totally that message"): a connect that is waiting is shown on the wallet's own row (its green connect icon throbs), never as a MESSAGE_PANEL page. Signing and sending still say who is deciding; a refusal still shows.
  const waitingText = approvalWaitingText(pending.filter((entry) => entry.action !== 'connect'));
  // 2026-11-03 (owner request): while the wallet list is on screen the wait is shown on the wallet's own row (it throbs), not by covering the list with this page. A refusal or failure still shows here.
  const walletListShowing = usePanelVisible(SP_COIN_DISPLAY.WALLET_LIST_SELECT_PANEL);
  const text = (walletListShowing ? '' : waitingText) || outcome?.text || '';
  const shown = useRef('');
  const currentSource = (exchangeContext as { errorMessage?: { source?: string } } | undefined)?.errorMessage?.source;
  // the effect below runs when the request ENDS, and by then the render it closed over may carry an older message: read the latest source
  const latestSource = useRef(currentSource);
  latestSource.current = currentSource;

  useEffect(() => {
    if (text) {
      if (shown.current === text) return;
      shown.current = text;
      setErrorMessage({ errCode: 0, msg: text, source: SOURCE, status: waitingText ? STATUS.INFO : STATUS.WARNING });
      openPanel(SP_COIN_DISPLAY.MESSAGE_PANEL, 'ApprovalWaiting:show');
      return;
    }
    // nothing pending and no refusal to report: the request was approved, so take our own message down.
    // 2026-11-01 (owner report: the notice stayed after the extension connected): the connect's own success clears or replaces the message, so the source is no longer ours (often empty); only another message's source keeps the panel up
    if (shown.current) {
      const source = latestSource.current;
      if (!source || source === SOURCE) closePanel(SP_COIN_DISPLAY.MESSAGE_PANEL, 'ApprovalWaiting:approved'); // by name, never a pop of whatever screen is on top (that closed a wallet list opened just before)
    }
    shown.current = '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, waitingText]);
}
