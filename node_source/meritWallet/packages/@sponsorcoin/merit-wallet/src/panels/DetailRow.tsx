// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/panels/DetailRow.tsx
//
// docs/meritMigration.txt row 31: one label and value row of a detail card (network and token details drew it twice, identically).
import React from 'react';
import { detailPanelStyle } from '@sponsorcoin/spcoin-common/styles';

export default function DetailRow({ label, value, zebra }: { label: string; value: React.ReactNode; zebra: boolean }) {
  return (
    <div style={detailPanelStyle.row(zebra)}>
      <span style={detailPanelStyle.label}>{label}</span>
      <span style={detailPanelStyle.value}>{value}</span>
    </div>
  );
}
