// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/account/form/CopyIcon.tsx
//
// docs/meritMigration.txt row 31: the copy-to-clipboard icon of the account form, drawn once (the form panel and the web's Create Account private key row each had the same inline SVG).
import React from 'react';

export default function CopyIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
