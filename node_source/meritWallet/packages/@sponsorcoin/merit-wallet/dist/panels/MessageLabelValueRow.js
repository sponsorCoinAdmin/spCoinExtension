// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/MessageLabelValueRow.tsx
//
// 2026-09-22, real migration — promoted verbatim (pure, zero hooks/props
// beyond label/value). One prominent "Label: value" line — shared by
// MessageDetailsSection for `amount`, `reason`, and `gasFee`.
'use client';
import { jsxs as _jsxs } from "react/jsx-runtime";
import { panelPartClass } from '@sponsorcoin/spcoin-common/styles';
export default function MessageLabelValueRow({ label, value }) {
    return (_jsxs("div", { className: panelPartClass.labelValue, children: [label, ": ", value] }));
}
