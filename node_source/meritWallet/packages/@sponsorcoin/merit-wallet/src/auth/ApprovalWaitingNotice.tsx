// File: src/auth/ApprovalWaitingNotice.tsx
//
// 2026-10-12 (docs/authenticationDesign.txt row 11 / 6A): the neutral "Waiting for X to approve ..." line shown while another wallet is deciding (src/auth/approvalWaiting.ts). It renders nothing when nothing is pending.
'use client';

import React, { useSyncExternalStore } from 'react';
import { approvalWaiting, approvalWaitingText, type ApprovalWaitingStore } from './approvalWaiting';

export default function ApprovalWaitingNotice({ store = approvalWaiting }: { store?: ApprovalWaitingStore }) {
  const pending = useSyncExternalStore(store.subscribe, store.getState, store.getState);
  const outcome = useSyncExternalStore(store.subscribe, store.getOutcome, store.getOutcome);
  // while a request is open the line says who is deciding; when one just ended in a refusal it says so, in the wallet's own words
  const text = approvalWaitingText(pending) || outcome?.text || '';
  if (!text) return null;
  return (
    <div role="status" aria-live="polite" style={{ boxSizing: 'border-box', margin: '6px 8px 0', padding: '8px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0b1220', color: '#cbd5e1', fontSize: 11 }}>
      {text}
    </div>
  );
}
