// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/ReadOnlyMetaDataTable.tsx
//
// 2026-09-22, real migration — promoted verbatim from the web app's real
// components/shared/ReadOnlyMetaDataTable.tsx. Pure, fully-controlled
// presentational table, zero coupling of any kind.
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { msTableTw } from '@sponsorcoin/spcoin-panels';
const th = 'px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-300/80';
const cell = 'px-3 py-3 text-sm align-middle';
const zebraA = 'bg-[rgba(56,78,126,0.35)]';
const zebraB = 'bg-[rgba(156,163,175,0.25)]';
const tableGrid = 'grid grid-cols-[max-content_minmax(0,1fr)]';
export default function ReadOnlyMetaDataTable({ rows, logoURL, logoAlt = '', logoVisible = true, id, className = '', logoBackgroundClassName = 'bg-[#11162A]', logoContainerClassName = 'p-2 bg-[#0b0e19] border border-black rounded-xl', logoRoundedClassName = 'rounded-full', logoContainerSizeClassName = 'w-fit mx-auto', logoSizeClassName = 'w-full max-w-[320px] aspect-square', }) {
    return (_jsxs("div", { id: id, className: `flex flex-col gap-0 ${className}`, children: [logoVisible && logoURL ? (_jsx("div", { className: `flex justify-center items-center ${logoContainerSizeClassName} ${logoContainerClassName}`, children: _jsx("img", { src: logoURL, alt: logoAlt, className: `object-contain ${logoSizeClassName} ${logoRoundedClassName} ${logoBackgroundClassName}` }) })) : null, _jsx("div", { className: "scrollbar-hide mb-4 mt-0 w-full min-w-0 overflow-x-hidden overflow-y-auto rounded-xl border border-black", children: _jsxs("div", { className: `w-full min-w-0 ${tableGrid}`, children: [_jsxs("div", { className: "contents", children: [_jsx("div", { className: `${msTableTw.theadRow} ${th} whitespace-nowrap border-b border-black`, children: "Field Name" }), _jsx("div", { className: `${msTableTw.theadRow} ${th} border-b border-black`, children: "Value" })] }), rows.map(({ label, value }, index) => {
                            const zebra = index % 2 === 0 ? zebraA : zebraB;
                            const isLast = index === rows.length - 1;
                            return (_jsxs("div", { className: "contents", children: [_jsx("div", { className: `${zebra} ${cell} whitespace-nowrap${isLast ? '' : ' border-b border-black'}`, children: label }), _jsx("div", { className: `${zebra} ${cell} min-w-0 break-all${isLast ? '' : ' border-b border-black'}`, children: value })] }, label));
                        })] }) })] }));
}
