// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/panels/DetailRow.tsx
//
// docs/meritMigration.txt row 31: one label and value row of a detail card (network and token details drew it twice, identically).
import React from 'react';
import { detailPanelStyle } from '@sponsorcoin/spcoin-common/styles';
import { useCopyFeedback } from '../platform/useCopyFeedback';

/** Own small inline SVG, not lucide-react (the package has no such dependency — see TokenSlotPanels.tsx's own CopyBtn for the Tailwind sibling of this icon). */
function CopyGlyph({ copied }: { copied: boolean }) {
  return copied ? (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export interface DetailRowProps {
  label: string;
  value: React.ReactNode;
  zebra: boolean;
  /** Owner report 2026-10-26: the Address row of a detail card (TokenDetailPanel, etc.) had no way to copy it, unlike every other place
   *  an address is shown. Set on a row whose `value` is the plain address string — renders a copy button beside it, same affordance
   *  every other address display in the panel tree already has (AssetSelectDropDown's showCopy, TokenSlotPanels' CopyBtn). */
  copyable?: boolean;
}

export default function DetailRow({ label, value, zebra, copyable }: DetailRowProps) {
  const { copy, copiedKey } = useCopyFeedback();
  const text = typeof value === 'string' ? value : undefined;
  const showCopy = copyable && !!text;
  return (
    <div style={detailPanelStyle.row(zebra)}>
      <span style={detailPanelStyle.label}>{label}</span>
      {showCopy ? (
        <span style={detailPanelStyle.valueRow}>
          <span style={detailPanelStyle.copyValue}>{value}</span>
          <button
            type="button"
            title="Copy to clipboard"
            aria-label="Copy to clipboard"
            onClick={() => copy(text!, label)}
            style={copiedKey === label ? detailPanelStyle.copyButtonCopied : detailPanelStyle.copyButton}
          >
            <CopyGlyph copied={copiedKey === label} />
          </button>
        </span>
      ) : (
        <span style={detailPanelStyle.value}>{value}</span>
      )}
    </div>
  );
}
