// File: src/auth/useApprovalMessagePanel.ts
//
// 2026-10-14 (owner request): "Waiting for MetaMask to approve connecting this site" and how the request ended ("MetaMask did not approve: User rejected the request.") are shown in MESSAGE_PANEL (the wallet's
// one message page), not as a floating line over the wallet. While a request is open the panel says who is deciding; when it ends in a refusal or a failure it says so and stays until it is closed; when the
// request is approved the panel this hook opened closes again. MESSAGE_PANEL is only closed here when this hook is what put the message there.
'use client';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { STATUS } from '@sponsorcoin/spcoin-common/context';
import { useExchangeContext, usePanelTree } from '@sponsorcoin/spcoin-exchange-engine';
import { approvalWaiting, approvalWaitingText } from './approvalWaiting';
const SOURCE = 'ApprovalWaiting';
export function useApprovalMessagePanel(store = approvalWaiting) {
    const pending = useSyncExternalStore(store.subscribe, store.getState, store.getState);
    const outcome = useSyncExternalStore(store.subscribe, store.getOutcome, store.getOutcome);
    const { exchangeContext, setErrorMessage } = useExchangeContext();
    const { openPanel, closePanel } = usePanelTree();
    const waitingText = approvalWaitingText(pending);
    const text = waitingText || outcome?.text || '';
    const shown = useRef('');
    const currentSource = exchangeContext?.errorMessage?.source;
    // the effect below runs when the request ENDS, and by then the render it closed over may carry an older message: read the latest source
    const latestSource = useRef(currentSource);
    latestSource.current = currentSource;
    useEffect(() => {
        if (text) {
            if (shown.current === text)
                return;
            shown.current = text;
            setErrorMessage({ errCode: 0, msg: text, source: SOURCE, status: waitingText ? STATUS.INFO : STATUS.WARNING });
            openPanel(SP_COIN_DISPLAY.MESSAGE_PANEL, 'ApprovalWaiting:show');
            return;
        }
        // nothing pending and no refusal to report: the request was approved, so take our own message down.
        // 2026-11-01 (owner report: the notice stayed after the extension connected): the connect's own success clears or replaces the message, so the source is no longer ours (often empty); only another message's source keeps the panel up
        if (shown.current) {
            const source = latestSource.current;
            if (!source || source === SOURCE)
                closePanel(SP_COIN_DISPLAY.MESSAGE_PANEL, 'NAV_POP:ApprovalWaiting:approved');
        }
        shown.current = '';
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [text, waitingText]);
}
