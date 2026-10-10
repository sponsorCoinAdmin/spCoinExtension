// File: src/account/form/DisconnectedControl.tsx
// 2026-10-09 (row 18) -- the disabled control the account editor shows while not connected; moved from the web app.
'use client';
import { jsx as _jsx } from "react/jsx-runtime";
export default function DisconnectedControl({ message, className = '' }) {
    return (_jsx("button", { type: "button", disabled: true, "aria-disabled": "true", className: `h-[42px] w-full rounded border border-white bg-[#1A1D2E] p-2 ${className}`.trim(), children: _jsx("span", { className: "block w-full text-center text-[120%] font-bold text-red-500", children: message }) }));
}
