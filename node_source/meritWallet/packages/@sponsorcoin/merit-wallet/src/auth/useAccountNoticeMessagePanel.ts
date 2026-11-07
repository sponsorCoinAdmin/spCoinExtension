// File: src/auth/useAccountNoticeMessagePanel.ts
//
// 2026-11-06 (owner): the notice that the other Merit wallet took accounts out of this wallet's list is a MESSAGE_PANEL popup, in the app's own style, with a row (icon, name, address) for each account it is about. The text and the rows are
// ErrorMessage content like every other message (the account rows sit where MESSAGE_ACCOUNTS_MARKER is). Each notice is shown once; the panel stays until the person closes it.
'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { MESSAGE_ACCOUNTS_MARKER, STATUS, type MessageAccountEntry } from '@sponsorcoin/spcoin-common/context';
import { engineTrace, useExchangeContext, usePanelTree, usePanelVisible } from '@sponsorcoin/spcoin-exchange-engine';
import { toMessageAccount } from '../receipt/transactionReceipts';
import { accountNoticeStore, type NoticeAccountProfile } from './accountNoticeStore';

const SOURCE = 'AccountNotice';
/** After the login panel closes the wallet restores its own screens; the popup waits a moment so it is the one on top. */
const AFTER_LOGIN_MS = 700;

/** The rows of a notice: one per account, the name, symbol and icon from the host's profiles when it has them. */
export function noticeAccountRows(addresses: string[], describe?: (address: string) => NoticeAccountProfile | undefined): MessageAccountEntry[] {
  const rows: MessageAccountEntry[] = [];
  for (const address of addresses) {
    const profile = describe?.(address);
    const account = toMessageAccount({ address, name: profile?.name, symbol: profile?.symbol, logoURL: profile?.iconSrc });
    if (account) rows.push({ role: 'ACCOUNT', account });
  }
  return rows;
}

export function useAccountNoticeMessagePanel(describe?: (address: string) => NoticeAccountProfile | undefined): void {
  const notice = useSyncExternalStore(accountNoticeStore.subscribe, accountNoticeStore.get, accountNoticeStore.get);
  const { setErrorMessage } = useExchangeContext();
  const { openPanel } = usePanelTree();
  const shownId = useRef(0);
  const describeRef = useRef(describe);
  describeRef.current = describe;

  // 2026-11-06: a notice made while the wallet is still locked (the handshake runs at page load) waits for the login: the login panel and the screens restored after it would otherwise cover the popup
  const loginOpen = usePanelVisible(SP_COIN_DISPLAY.PASSWORD_PANEL);

  useEffect(() => {
    if (!notice || shownId.current === notice.id || loginOpen) return undefined;
    const timer = setTimeout(() => {
      shownId.current = notice.id;
      engineTrace('accountNotice:show', { id: notice.id, message: notice.message, accounts: notice.addresses.length });
      const accounts = noticeAccountRows(notice.addresses, describeRef.current);
      setErrorMessage({
        errCode: 0,
        msg: accounts.length ? `${notice.message}\n${MESSAGE_ACCOUNTS_MARKER}` : notice.message,
        source: SOURCE,
        status: STATUS.WARNING,
        accounts,
      });
      openPanel(SP_COIN_DISPLAY.MESSAGE_PANEL, 'AccountNotice:show');
    }, AFTER_LOGIN_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notice?.id, loginOpen]);
}
