// File: src/account/form/DisconnectedControl.tsx
// 2026-10-09 (row 18) -- the disabled control the account editor shows while not connected; moved from the web app.
'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { disconnectedControlClass } from '@sponsorcoin/spcoin-common/styles';
export default function DisconnectedControl({ message, className = '' }) {
    return (_jsx("button", { type: "button", disabled: true, "aria-disabled": "true", className: disconnectedControlClass.box(className), children: _jsx("span", { className: disconnectedControlClass.message, children: message }) }));
}
