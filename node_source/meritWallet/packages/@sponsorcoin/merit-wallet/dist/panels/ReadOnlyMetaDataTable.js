// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/ReadOnlyMetaDataTable.tsx
//
// 2026-09-22, real migration — promoted verbatim from the web app's real
// components/shared/ReadOnlyMetaDataTable.tsx. Pure, fully-controlled
// presentational table, zero coupling of any kind.
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { msTableTw } from '@sponsorcoin/spcoin-panels';
import { metaTableClass } from '@sponsorcoin/spcoin-common/styles';
export default function ReadOnlyMetaDataTable({ rows, logoURL, logoAlt = '', logoVisible = true, id, className = '', logoBackgroundClassName = metaTableClass.logoBackground, logoContainerClassName = metaTableClass.logoContainer, logoRoundedClassName = metaTableClass.logoRounded, logoContainerSizeClassName = metaTableClass.logoContainerSize, logoSizeClassName = metaTableClass.logoSize, }) {
    return (_jsxs("div", { id: id, className: metaTableClass.root(className), children: [logoVisible && logoURL ? (_jsx("div", { className: metaTableClass.logoBox(logoContainerSizeClassName, logoContainerClassName), children: _jsx("img", { src: logoURL, alt: logoAlt, className: metaTableClass.logoImage(logoSizeClassName, logoRoundedClassName, logoBackgroundClassName) }) })) : null, _jsx("div", { className: metaTableClass.frame, children: _jsxs("div", { className: metaTableClass.gridBox(metaTableClass.grid), children: [_jsxs("div", { className: metaTableClass.contents, children: [_jsx("div", { className: metaTableClass.headCell(msTableTw.theadRow, metaTableClass.th, true), children: "Field Name" }), _jsx("div", { className: metaTableClass.headCell(msTableTw.theadRow, metaTableClass.th, false), children: "Value" })] }), rows.map(({ label, value }, index) => {
                            const zebra = index % 2 === 0 ? metaTableClass.zebraA : metaTableClass.zebraB;
                            const isLast = index === rows.length - 1;
                            return (_jsxs("div", { className: metaTableClass.contents, children: [_jsx("div", { className: metaTableClass.labelCell(zebra, metaTableClass.cell, isLast), children: label }), _jsx("div", { className: metaTableClass.valueCell(zebra, metaTableClass.cell, isLast), children: value })] }, label));
                        })] }) })] }));
}
