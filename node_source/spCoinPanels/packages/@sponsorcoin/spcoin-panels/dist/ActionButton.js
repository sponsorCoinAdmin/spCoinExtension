// File: src/ActionButton.tsx
// Portable ActionButton (2026-09-27, Phase 4 TRADING_STATION_PANEL).
// Pure presentation component — no non-portable imports. Accepts a
// bgClass variant that controls the button color scheme. The caller derives
// this from its own button-type state machine (which depends on
// useExchangeContext/useErrorMessage — not portable yet).
'use client';
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
export default function ActionButton({ id, text, bgClass, onClick, disabled = false, busy = false, endAdornment, warnOnHover = false, hoverText, }) {
    return (_jsxs("div", { className: "relative p-0 m-0", children: [_jsx("button", { id: id, type: "button", onClick: onClick, disabled: disabled, className: [
                    'group flex items-center justify-center',
                    bgClass === 'bg-orange-600' ? 'text-white' : 'text-[#5981F3]',
                    bgClass,
                    'w-full h-[34px]',
                    'text-[12px] font-bold',
                    'rounded-[8px]',
                    'transition-[color,background-color] duration-300',
                    disabled
                        ? busy
                            ? 'opacity-60 cursor-not-allowed hover:bg-orange-500'
                            : warnOnHover
                                ? 'opacity-60 cursor-not-allowed hover:bg-orange-600 hover:text-white'
                                : 'opacity-60 cursor-not-allowed'
                        : warnOnHover
                            ? 'hover:cursor-pointer hover:bg-orange-600 hover:text-white'
                            : 'hover:cursor-pointer hover:text-green-500',
                ].join(' '), children: warnOnHover && hoverText !== undefined ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "group-hover:hidden", children: text }), _jsx("span", { className: "hidden group-hover:inline group-hover:animate-throb", children: hoverText })] })) : (_jsx("span", { className: warnOnHover ? 'group-hover:animate-throb' : undefined, children: text })) }), endAdornment && (_jsx("span", { className: "absolute inset-y-0 right-3 z-10 flex items-center", children: endAdornment }))] }));
}
