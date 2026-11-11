// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/panels/AcknowledgeDialog.tsx
//
// 2026-11-10 (owner, docs/design/removeAccountPlan.txt): the small popup behind a check box of the Remove Account confirmation. Two shapes:
// The words, a radio button that is a TOGGLE (pressing it again clears it; "I understand" ...), and two buttons: the accepting one (Delete Anyway / Confirm) is dimmed until the radio is on and then checks the box; Reject / Cancel, or the X at the top right, closes the popup and leaves the box unchecked.
'use client';

import { acknowledgeStyle, dialogStyle } from '@sponsorcoin/spcoin-common/styles';
import { X } from 'lucide-react';
import { useState } from 'react';
import DialogPortal from '../DialogPortal';
import type { MessagePanelAcknowledgement } from './MessagePanelReal';

export default function AcknowledgeDialog({ ack, onAccept, onClose }: { ack: MessagePanelAcknowledgement; onAccept: () => void; onClose: () => void }) {
  const [understood, setUnderstood] = useState(false);
  return (
    <DialogPortal>
      <div role="dialog" aria-modal="true" aria-label={ack.title} style={dialogStyle.backdrop}>
        <div style={acknowledgeStyle.card}>
          <button type="button" onClick={onClose} aria-label="Close" title="Close" style={acknowledgeStyle.closeButton}>
            <X size={16} />
          </button>
          <p style={acknowledgeStyle.title}>{ack.title}</p>
          <p style={acknowledgeStyle.leftWarning}>{ack.message}</p>
          {ack.detail ? <p style={acknowledgeStyle.detail}>{ack.detail}</p> : null}
          <label style={acknowledgeStyle.radioRow}>
            {/* a radio button that toggles: onClick flips it, since a radio's own change event never fires to clear it */}
            <input type="radio" name="acknowledge" checked={understood} onChange={() => undefined} onClick={() => setUnderstood((v) => !v)} style={acknowledgeStyle.input} />
            {ack.choiceLabel}
          </label>
          <button type="button" disabled={!understood} onClick={onAccept} style={dialogStyle.dangerButton(!understood, true)}>
            {ack.acceptLabel}
          </button>
          <button type="button" onClick={onClose} style={dialogStyle.cancelButton}>
            {ack.rejectLabel}
          </button>
        </div>
      </div>
    </DialogPortal>
  );
}
