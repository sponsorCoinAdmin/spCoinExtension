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

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { usePlatform } from '../platform/platform';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import type { ErrorMessage, MessageAccountEntry, MessageTokenEntry } from '@sponsorcoin/spcoin-common/context';
import { MESSAGE_ACCOUNTS_MARKER } from '@sponsorcoin/spcoin-common/context';
import { usePanelVisible, usePanelTree, getPanelOpenLog, describePanelOpen } from '@sponsorcoin/spcoin-exchange-engine';
import { errorPanelDisplayStore } from './errorPanelDisplayStore';
import { MESSAGE_STATUS_STYLES, classifyMessageStatus, SmallYellowButton } from '@sponsorcoin/spcoin-panels';
import MessageDetailsSection from './MessageDetailsSection';
import { messagePanelClass, walletPartClass } from '@sponsorcoin/spcoin-common/styles';


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
  const platform = usePlatform();
  const [copyLabel, setCopyLabel] = useState('Copy');
  const wrap = useSyncExternalStore(
    errorPanelDisplayStore.subscribe,
    errorPanelDisplayStore.getSnapshot,
    errorPanelDisplayStore.getServerSnapshot,
  );

  // 2026-10-13 (owner request: catch and log this properly): this panel can become visible with NO message behind it (a stale display-stack entry restored by a pop, an open that never set errorMessage). That used to
  // read as a bare "Something went wrong / An unexpected error occurred." Now the box says there was no message and who made it visible, and the same facts go to the console.
  const noMessage = !errorMessage?.msg;
  const openedBy = noMessage && visible ? getPanelOpenLog(panelId, 3).map((record) => describePanelOpen(record)) : [];
  useEffect(() => {
    if (!visible || !noMessage) return;
    // eslint-disable-next-line no-console
    console.warn('[MESSAGE_PANEL] shown with no message', { openedBy: getPanelOpenLog(panelId, 5), errorMessage });
  }, [visible, noMessage, panelId, errorMessage]);

  if (!visible) return null;

  const kind = classifyMessageStatus(errorMessage?.status, errorMessage?.msg);
  const isUnsupportedNetworkError =
    kind === 'error' && errorMessage?.source === 'useNetworkController:onChainChanged';
  const rawMsg = noMessage
    ? ['This panel was opened without a message.', ...(openedBy.length ? openedBy : ['No record of what opened it (see the console for details).'])].join('\n')
    : (errorMessage?.msg as string);
  const lines = rawMsg.split('\n');
  const firstLine = lines[0]?.trim() ?? '';
  const body = lines.slice(1).join('\n').replace(/^\n+/, '');
  const title = noMessage
    ? 'No message to show'
    : isUnsupportedNetworkError
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
    <div className={messagePanelClass.outer}>
      <div
        id="MESSAGE_PANEL"
        className={messagePanelClass.box(isUnsupportedNetworkError, styles.border, styles.bg, styles.text)}
        role={kind === 'error' ? 'alert' : 'status'}
        aria-live={kind === 'error' ? 'assertive' : 'polite'}
      >
        <div className={messagePanelClass.titleRow}>
          <h3 className={messagePanelClass.title}>{kind !== 'warning' ? title : ''}</h3>
          <div className={messagePanelClass.buttons}>
            <SmallYellowButton
              title="Copy message"
              onClick={async () => {
                const text = `${kind !== 'warning' ? `${title}
` : ''}${bodyRef.current?.innerText ?? rawMsg}`;
                try {
                  await platform.copyText(text);
                  setCopyLabel('Copied');
                  setTimeout(() => setCopyLabel('Copy'), 1400);
                } catch {
                  setCopyLabel('Copy Failed');
                  setTimeout(() => setCopyLabel('Copy'), 1800);
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

        <div ref={bodyRef} className={messagePanelClass.body}>
        <div className={messagePanelClass.block}>
          <p className={messagePanelClass.text(wrap, isUnsupportedNetworkError ? walletPartClass.unsupportedTop : '')}>
            {bodyHead}
          </p>
        </div>

        <MessageDetailsSection errorMessage={errorMessage} renderAccountRow={renderAccountRow} renderTokenRow={renderTokenRow} />

        {bodyTail && (
          <div className={messagePanelClass.block}>
            <p className={messagePanelClass.text(wrap)}>
              {bodyTail}
            </p>
          </div>
        )}

        {hasSource && (
          <div className={messagePanelClass.source}>
            {errorMessage?.source && (
              <div>
                <span className={messagePanelClass.sourceLabel}>Source:</span> {errorMessage.source}
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
