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

import { useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import type { ErrorMessage, MessageAccountEntry, MessageTokenEntry } from '@sponsorcoin/spcoin-common/context';
import { MESSAGE_ACCOUNTS_MARKER } from '@sponsorcoin/spcoin-common/context';
import { usePanelVisible, usePanelTree } from '@sponsorcoin/spcoin-exchange-engine';
import { errorPanelDisplayStore } from './errorPanelDisplayStore';
import { MESSAGE_STATUS_STYLES, classifyMessageStatus } from '@sponsorcoin/spcoin-panels';
import MessageDetailsSection from './MessageDetailsSection';
import { SmallYellowButton } from '@sponsorcoin/spcoin-panels';

export interface MessagePanelRealProps {
  panelId?: SP_COIN_DISPLAY;
  errorMessage: ErrorMessage | undefined;
  renderAccountRow: (entry: MessageAccountEntry, index: number) => ReactNode;
  renderTokenRow: (entry: MessageTokenEntry, index: number) => ReactNode;
}

export default function MessagePanelReal({
  panelId = SP_COIN_DISPLAY.MESSAGE_PANEL,
  errorMessage,
  renderAccountRow,
  renderTokenRow,
}: MessagePanelRealProps) {
  const visible = usePanelVisible(panelId);
  const { closePanel } = usePanelTree();
  // 2026-10-06, on request — every message gets a Copy button and a close X in its top right.
  // Copy reads the rendered body (not the header row), so the account/token breakdown is included.
  const bodyRef = useRef<HTMLDivElement>(null);
  const [copyLabel, setCopyLabel] = useState('Copy');
  const wrap = useSyncExternalStore(
    errorPanelDisplayStore.subscribe,
    errorPanelDisplayStore.getSnapshot,
    errorPanelDisplayStore.getServerSnapshot,
  );

  if (!visible) return null;

  const kind = classifyMessageStatus(errorMessage?.status, errorMessage?.msg);
  const isUnsupportedNetworkError =
    kind === 'error' && errorMessage?.source === 'useNetworkController:onChainChanged';
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

  const hasDetailsBlock = Boolean(
    errorMessage?.accounts?.length || errorMessage?.tokens?.length || errorMessage?.amount || errorMessage?.reason || errorMessage?.gasFee,
  );
  const markerIndex = hasDetailsBlock ? bodyText.indexOf(MESSAGE_ACCOUNTS_MARKER) : -1;
  const bodyHead = markerIndex >= 0 ? bodyText.slice(0, markerIndex).replace(/\n+$/, '') : bodyText;
  const bodyTail =
    markerIndex >= 0 ? bodyText.slice(markerIndex + MESSAGE_ACCOUNTS_MARKER.length).replace(/^\n+/, '') : '';

  const hasSource = Boolean(errorMessage?.source);
  const styles = MESSAGE_STATUS_STYLES[kind];

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden">
      <div
        id="MESSAGE_PANEL"
        className={`flex flex-col min-w-0 ${
          isUnsupportedNetworkError ? 'gap-1' : 'gap-3'
        } w-full rounded-[15px] p-4 border ${styles.border} ${styles.bg} ${styles.text} min-h-0 overflow-y-auto overflow-x-auto scrollbar-hide [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
        role={kind === 'error' ? 'alert' : 'status'}
        aria-live={kind === 'error' ? 'assertive' : 'polite'}
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold">{kind !== 'warning' ? title : ''}</h3>
          <div className="flex shrink-0 items-center gap-1">
            <SmallYellowButton
              title="Copy message"
              onClick={async () => {
                const text = `${kind !== 'warning' ? `${title}
` : ''}${bodyRef.current?.innerText ?? rawMsg}`;
                try {
                  await navigator.clipboard.writeText(text);
                  setCopyLabel('Copied');
                  window.setTimeout(() => setCopyLabel('Copy'), 1400);
                } catch {
                  setCopyLabel('Copy Failed');
                  window.setTimeout(() => setCopyLabel('Copy'), 1800);
                }
              }}
            >
              {copyLabel}
            </SmallYellowButton>
            <SmallYellowButton title="Close message" aria-label="Close message" onClick={() => closePanel(panelId, 'MessagePanel:close')}>
              X
            </SmallYellowButton>
          </div>
        </div>

        <div ref={bodyRef} className="flex flex-col gap-3 min-w-0">
        <div className="min-w-0">
          <p
            className={`text-[15.4px] leading-relaxed ${
              wrap ? 'whitespace-pre-wrap break-words break-all' : 'whitespace-pre'
            } ${isUnsupportedNetworkError ? 'mt-2' : ''}`}
          >
            {bodyHead}
          </p>
        </div>

        <MessageDetailsSection errorMessage={errorMessage} renderAccountRow={renderAccountRow} renderTokenRow={renderTokenRow} />

        {bodyTail && (
          <div className="min-w-0">
            <p
              className={`text-[15.4px] leading-relaxed ${
                wrap ? 'whitespace-pre-wrap break-words break-all' : 'whitespace-pre'
              }`}
            >
              {bodyTail}
            </p>
          </div>
        )}

        {hasSource && (
          <div className="text-xs opacity-80 mt-2">
            {errorMessage?.source && (
              <div>
                <span className="font-medium">Source:</span> {errorMessage.source}
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
