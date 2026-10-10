// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/AddressPanel.tsx
//
// 2026-10-05 — portable ADDRESS_PANEL: the "Enter address" bar plus, below it,
// the preview row for whatever the entered address resolved to. Pure
// presentation: the host owns the value and decides what `preview` is, so the
// extension can resolve against its own rows while the web app keeps feeding
// its FSM result into the same pieces (see HexAddressInput / AssetPreviewRow).
// Entering an address never leaves the panel — the preview row is clicked to
// commit, exactly like the web app.
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { HexAddressInput } from '@sponsorcoin/spcoin-panels';
import { AssetPreviewRow } from '@sponsorcoin/spcoin-panels';
export default function AddressPanel({ value, onChange, placeholder = 'Enter address', preview, }) {
    return (_jsxs("div", { id: "AddressPanel", style: { display: 'flex', flexDirection: 'column', gap: 4, padding: 0 }, children: [_jsx(HexAddressInput, { inputValue: value, onChange: onChange, placeholder: placeholder }), preview ? _jsx(AssetPreviewRow, { ...preview }) : null] }));
}
