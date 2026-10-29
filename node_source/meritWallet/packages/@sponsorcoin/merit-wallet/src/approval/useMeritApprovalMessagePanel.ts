// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/approval/useMeritApprovalMessagePanel.ts
//
// 2026-10-29, on request ("why do we have this popup at all [...] it
// should at least open in message panel [...] Yes, move it into Message
// Panel") — replaces ApprovalResponder.tsx's own standalone full-screen
// backdrop. Same decision logic (a new request needs a password, then an
// approval, or resolves itself at once), but instead of rendering its own
// TransactionConfirmPanel over everything, it writes the request into
// MESSAGE_PANEL (the wallet's one message page — same mechanism
// useApprovalMessagePanel.ts already uses for the external-wallet
// "waiting" notice) and publishes a MessagePanelPendingApproval through
// pendingApprovalMessageStore for the password field + Approve/Reject
// buttons, rendered in the app's own message chrome instead of a second,
// separately-styled overlay.
//
// A store, not a return value: ConnectedMessagePanel (what actually
// renders MessagePanelReal) is mounted in more than one place — the
// extension's inline body-overlay chain in MeritWallet.tsx AND the web
// app's own standalone components/views/MessagePanel.tsx, rendered
// entirely outside MeritWallet.tsx's tree ("WalletOverlayHost mounts
// ConnectedMessagePanel directly") — so a prop threaded from this hook's
// return value could only ever reach one of them. See that store's own
// doc comment.
//
// Mounted once in MeritWallet.tsx in place of <ApprovalResponder host=.../>
// — see that file's own call site.
'use client';

import { useEffect, useRef, useState } from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { STATUS } from '@sponsorcoin/spcoin-common/context';
import { useExchangeContext, usePanelTree } from '@sponsorcoin/spcoin-exchange-engine';
import { getPendingMeritApproval, resolveMeritApproval, subscribeMeritApproval, type MeritApprovalRequest } from './meritApproval';
import { pendingApprovalMessageStore } from './pendingApprovalMessageStore';

const SOURCE = 'MeritApproval';

export interface ApprovalHost {
  /** Check the wallet password and unlock the wallet; true when it unlocked. Omitted: a request that needs a password is refused. */
  unlock?(password: string): Promise<boolean>;
  /** A debug gate: a request that asked to advance by hand waits for this before it resolves. Omitted: it resolves at once. */
  waitForManualAdvance?(): Promise<void>;
}

export function useMeritApprovalMessagePanel(host?: ApprovalHost): void {
  const [request, setRequest] = useState<MeritApprovalRequest | null>(getPendingMeritApproval());
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [isApprovalOpen, setIsApprovalOpen] = useState(false);
  const [passwordConfirmed, setPasswordConfirmed] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const { setErrorMessage } = useExchangeContext();
  const { openPanel, closePanel } = usePanelTree();
  const shownRef = useRef(false);

  useEffect(() => subscribeMeritApproval(setRequest), []);

  // a new request starts every step closed
  useEffect(() => {
    setIsPasswordOpen(false);
    setIsApprovalOpen(false);
    setPasswordConfirmed(false);
    setIsSigning(false);
    setPasswordError('');
  }, [request?.id]);

  // 'decide': a person is needed (password, then approval) or the request resolves at once; resolveMeritApproval ignores a request that already moved on
  useEffect(() => {
    if (request?.phase !== 'decide') return;
    if (request.isLocked && !passwordConfirmed) {
      setIsPasswordOpen(true);
      return;
    }
    if (request.needsApproval) {
      setIsApprovalOpen(true);
      return;
    }
    if (request.manualAdvance && host?.waitForManualAdvance) {
      let cancelled = false;
      host.waitForManualAdvance().then(() => { if (!cancelled) resolveMeritApproval(true); }).catch(() => undefined);
      return () => { cancelled = true; };
    }
    const timer = setTimeout(() => resolveMeritApproval(true), 0);
    return () => clearTimeout(timer);
  }, [request?.id, request?.phase, request?.isLocked, request?.needsApproval, request?.manualAdvance, passwordConfirmed, host]);

  // one screen, one action: Approve (with the password when the wallet is locked) unlocks and approves in that one step
  const approve = async (password?: string) => {
    if (request?.isLocked && !passwordConfirmed) {
      const unlocked = host?.unlock ? await host.unlock(password ?? '') : false;
      if (!unlocked) {
        setPasswordError('Incorrect password.');
        return;
      }
      setPasswordError('');
      setPasswordConfirmed(true);
      setIsPasswordOpen(false);
    }
    setIsSigning(true);
    resolveMeritApproval(true);
  };

  const phase = request?.phase;
  const showing = (phase === 'decide' || isSigning) && ((request?.isLocked && !passwordConfirmed && isPasswordOpen) || (request?.needsApproval && isApprovalOpen));

  // MESSAGE_PANEL bridge: write the request's own identity rows (accounts/tokens/amount — same
  // MessageAccountEntry/MessageTokenEntry/MessageAmountEntry shapes ErrorMessage already takes, so
  // no reshaping needed) into the shared errorMessage field and open the panel, exactly the way
  // useApprovalMessagePanel.ts already does for the external-wallet "waiting" notice. Publishes the
  // decision controls through pendingApprovalMessageStore in the same pass (see that store's own
  // doc comment for why this isn't a plain return value). Only ever closes the panel if THIS hook is
  // the one that opened it (shownRef), so it never pops a message some other caller put up.
  useEffect(() => {
    if (!showing || !request) {
      pendingApprovalMessageStore.set(null);
      if (shownRef.current) {
        shownRef.current = false;
        closePanel(SP_COIN_DISPLAY.MESSAGE_PANEL, 'NAV_POP:MeritApproval:resolved');
      }
      return;
    }
    shownRef.current = true;
    setErrorMessage({
      errCode: 0,
      msg: `${request.title ?? `Approve ${request.label}`}\nReview this transaction before it is signed.`,
      source: SOURCE,
      status: STATUS.INFO,
      accounts: request.accounts,
      tokens: request.tokens,
      amount: request.amount,
    });
    openPanel(SP_COIN_DISPLAY.MESSAGE_PANEL, 'MeritApproval:show');
    pendingApprovalMessageStore.set({
      requirePassword: Boolean(request.isLocked && !passwordConfirmed),
      passwordError,
      busy: isSigning,
      onApprove: (password) => void approve(password),
      onReject: () => {
        setIsApprovalOpen(false);
        setIsPasswordOpen(false);
        resolveMeritApproval(false);
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showing, request?.id, passwordError, isSigning]);
}
