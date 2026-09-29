// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/MessagePanelReal.tsx
//
// 2026-09-22, real migration (opaque-slot split) — promoted from the web
// app's real components/views/MessagePanel.tsx. Named MessagePanelReal
// (not MessagePanel) since the package already has a separate, inert
// MessagePanel.tsx placeholder (Tailwind-free, standalone, extension-only
// today) -- same naming caution as MeritInfoPanelReal/ProcessFlowPanel/
// TransactionConfirmPanel. `errorMessage` is a plain prop (the one real
// ExchangeContext coupling, via the web app's own useErrorMessage()); the
// wrap toggle (errorPanelDisplayStore) is genuinely portable and imported
// directly here, same self-gating convention usePanelVisible already
// establishes. renderAccountRow/renderTokenRow are slots for the real,
// locally-coupled MessageAccountRow/MessageTokenRow -- see
// MessageDetailsSection.tsx's own header comment for why those specific
// two rows can't move.
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useSyncExternalStore } from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { MESSAGE_ACCOUNTS_MARKER } from '@sponsorcoin/spcoin-common/context';
import { usePanelVisible } from '@sponsorcoin/spcoin-exchange-engine';
import { errorPanelDisplayStore } from './errorPanelDisplayStore';
import { MESSAGE_STATUS_STYLES, classifyMessageStatus } from './messageStatusStyles';
import MessageDetailsSection from './MessageDetailsSection';
export default function MessagePanelReal({ panelId = SP_COIN_DISPLAY.MESSAGE_PANEL, errorMessage, renderAccountRow, renderTokenRow, }) {
    const visible = usePanelVisible(panelId);
    const wrap = useSyncExternalStore(errorPanelDisplayStore.subscribe, errorPanelDisplayStore.getSnapshot, errorPanelDisplayStore.getServerSnapshot);
    if (!visible)
        return null;
    const kind = classifyMessageStatus(errorMessage?.status, errorMessage?.msg);
    const isUnsupportedNetworkError = kind === 'error' && errorMessage?.source === 'useNetworkController:onChainChanged';
    const rawMsg = errorMessage?.msg ?? 'An unexpected error occurred.';
    const lines = rawMsg.split('\n');
    const firstLine = lines[0]?.trim() ?? '';
    const body = lines.slice(1).join('\n').replace(/^\n+/, '');
    const title = isUnsupportedNetworkError
        ? firstLine || 'Network not supported on "Sponsor Coin"'
        : kind === 'success'
            ? 'Success'
            : kind === 'info'
                ? 'Notice'
                : kind === 'warning'
                    ? 'Warning'
                    : kind === 'trace'
                        ? 'Trace Debugging'
                        : 'Something went wrong';
    const bodyText = isUnsupportedNetworkError ? body : rawMsg;
    const hasDetailsBlock = Boolean(errorMessage?.accounts?.length || errorMessage?.tokens?.length || errorMessage?.amount || errorMessage?.reason || errorMessage?.gasFee);
    const markerIndex = hasDetailsBlock ? bodyText.indexOf(MESSAGE_ACCOUNTS_MARKER) : -1;
    const bodyHead = markerIndex >= 0 ? bodyText.slice(0, markerIndex).replace(/\n+$/, '') : bodyText;
    const bodyTail = markerIndex >= 0 ? bodyText.slice(markerIndex + MESSAGE_ACCOUNTS_MARKER.length).replace(/^\n+/, '') : '';
    const hasSource = Boolean(errorMessage?.source);
    const styles = MESSAGE_STATUS_STYLES[kind];
    return (_jsx("div", { className: "h-full min-h-0 flex flex-col overflow-hidden", children: _jsxs("div", { id: "MESSAGE_PANEL", className: `flex flex-col min-w-0 ${isUnsupportedNetworkError ? 'gap-1' : 'gap-3'} w-full rounded-[15px] p-4 border ${styles.border} ${styles.bg} ${styles.text} min-h-0 overflow-y-auto overflow-x-auto scrollbar-hide [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`, role: kind === 'error' ? 'alert' : 'status', "aria-live": kind === 'error' ? 'assertive' : 'polite', children: [kind !== 'warning' && (_jsx("div", { className: "flex items-center justify-between", children: _jsx("h3", { className: "text-base font-semibold", children: title }) })), _jsx("div", { className: "min-w-0", children: _jsx("p", { className: `text-[15.4px] leading-relaxed ${wrap ? 'whitespace-pre-wrap break-words break-all' : 'whitespace-pre'} ${isUnsupportedNetworkError ? 'mt-2' : ''}`, children: bodyHead }) }), _jsx(MessageDetailsSection, { errorMessage: errorMessage, renderAccountRow: renderAccountRow, renderTokenRow: renderTokenRow }), bodyTail && (_jsx("div", { className: "min-w-0", children: _jsx("p", { className: `text-[15.4px] leading-relaxed ${wrap ? 'whitespace-pre-wrap break-words break-all' : 'whitespace-pre'}`, children: bodyTail }) })), hasSource && (_jsx("div", { className: "text-xs opacity-80 mt-2", children: errorMessage?.source && (_jsxs("div", { children: [_jsx("span", { className: "font-medium", children: "Source:" }), " ", errorMessage.source] })) }))] }) }));
}
