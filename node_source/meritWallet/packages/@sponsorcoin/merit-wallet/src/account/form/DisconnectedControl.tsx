// File: src/account/form/DisconnectedControl.tsx
// 2026-10-09 (row 18) -- the disabled control the account editor shows while not connected; moved from the web app.
'use client';

import { disconnectedControlClass } from '@sponsorcoin/spcoin-common/styles';

interface Props {
  message: string;
  className?: string;
}

export default function DisconnectedControl({ message, className = '' }: Props) {
  return (
    <button
      type="button"
      disabled
      aria-disabled="true"
      className={disconnectedControlClass.box(className)}
    >
      <span className={disconnectedControlClass.message}>{message}</span>
    </button>
  );
}
