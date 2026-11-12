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

import React, { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { usePlatform } from '../platform/platform';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import type { ErrorMessage, MessageAccountEntry, MessageTokenEntry } from '@sponsorcoin/spcoin-common/context';
import { MESSAGE_ACCOUNTS_MARKER } from '@sponsorcoin/spcoin-common/context';
import { usePanelVisible, usePanelTree, getPanelOpenLog, describePanelOpen, useAppChainId } from '@sponsorcoin/spcoin-exchange-engine';
import { errorPanelDisplayStore } from './errorPanelDisplayStore';
import { MESSAGE_STATUS_STYLES, classifyMessageStatus, SmallYellowButton, TokenLogo } from '@sponsorcoin/spcoin-panels';
import MessageDetailsSection from './MessageDetailsSection';
import { messagePanelClass, walletPartClass, transactionConfirmPanelStyle, messageContractLogoStyle, removeAccountStyle, dialogStyle, acknowledgeStyle } from '@sponsorcoin/spcoin-common/styles';
import AcknowledgeDialog from './AcknowledgeDialog';
import { scheduleClipboardClear } from './clipboardClear';
import { Eye, EyeOff } from 'lucide-react';

/** The text of a message, with the small image of the contract after every "Contract: 0x…" line (the Uniswap router's logo on a swap receipt); every other line is plain text. */
function MessageText({ text, chainId }: { text: string; chainId: number }) {
  const lines = text.split('\n');
  return (
    <>
      {lines.map((line, i) => {
        const newline = i < lines.length - 1 ? '\n' : '';
        const match = /^(Contract: )(0x[0-9a-fA-F]{40})\s*$/.exec(line);
        if (!match) return <React.Fragment key={i}>{line}{newline}</React.Fragment>;
        // a row of its own (its end is the line break, so no newline follows it)
        return (
          <span key={i} style={messageContractLogoStyle.row}>
            <span style={messageContractLogoStyle.box}>
              <TokenLogo address={match[2]} chainId={chainId} className="" style={messageContractLogoStyle.img} />
            </span>
            <span style={messageContractLogoStyle.text}>{match[1]}{match[2]}</span>
          </span>
        );
      })}
    </>
  );
}

/** 2026-11-11 (owner): a heading that is a link; clicking it expands / collapses its explanation (all start collapsed). A section's text is copied by Copy only while it is open (Copy reads the rendered body). */
function CollapsibleSection({ heading, items, wrap, defaultOpen }: { heading: string; items: string[]; wrap: boolean; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className={messagePanelClass.block}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={collapsibleSectionStyle.heading}
      >
        <span aria-hidden="true">{open ? '▾' : '▸'}</span> {heading}
      </button>
      {open && (
        <ul className={messagePanelClass.text(wrap)} style={collapsibleSectionStyle.list}>
          {items.map((item, i) => <li key={i} style={collapsibleSectionStyle.item}>{item}</li>)}
        </ul>
      )}
    </div>
  );
}

const collapsibleSectionStyle = {
  heading: { background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'inherit', font: 'inherit', fontWeight: 700, textDecoration: 'underline', textAlign: 'left' } as React.CSSProperties,
  list: { margin: '6px 0 0 0', paddingLeft: 22, listStyleType: 'disc', whiteSpace: 'normal' } as React.CSSProperties,
  item: { margin: '0 0 4px 0' } as React.CSSProperties,
};

/**
 * 2026-10-29, on request ("it should be in the Message panel" — the
 * standalone Merit approval backdrop, ApprovalResponder.tsx, read as "out
 * of character" for the app) — when a Merit-authorized write needs a
 * person (a password, since "Mandatory Approval Required"'s own
 * Approve/Reject click was retired 2026-09-07 — the password prompt IS the
 * approval now), this panel shows the password field and Approve/Reject
 * buttons itself instead of a second, separately-styled overlay sitting on
 * top of everything. useMeritApprovalMessagePanel.ts (this package's own
 * replacement for ApprovalResponder.tsx) is what builds this prop and
 * drives it — see that hook's own doc comment for the full wiring.
 */
export interface MessagePanelPendingApproval {
  requirePassword: boolean;
  passwordError: string;
  /** True once Approve has been clicked and the real write is in flight — disables both controls, Approve reads "Signing…". */
  busy: boolean;
  onApprove: (password?: string) => void;
  onReject: () => void;
  /** 2026-11-07: the words of the two buttons when a message is a question that is not a write ("Continue" / "Cancel"). Default Approve / Reject. */
  approveLabel?: string;
  rejectLabel?: string;
  /**
   * 2026-11-10 (docs/design/removeAccountPlan.txt X6): a private key the person may look at before deciding (the local Remove Account confirmation). The key is hidden (stars) behind a Show / Hide Private Key toggle; showing it calls this with the
   * typed password (the vault checks it again); it hides after KEY_SHOW_MS, and Copy warns about the clipboard.
   */
  revealKey?: (password: string) => Promise<string>;
  /** 2026-11-10 (owner): check boxes the person must tick before the approve button works; ticking one opens its popup (AcknowledgeDialog), which checks the box on acceptance and leaves it unchecked on Reject, Cancel or the X. */
  acknowledgements?: MessagePanelAcknowledgement[];
  /** 2026-11-11 (owner): the heading shown in the wallet's PANEL_TITLE (one line) while this message is up, instead of the screen's own title. */
  panelTitle?: string;
}

export interface MessagePanelAcknowledgement {
  id: string;
  /** The check box's words. */
  label: string;
  /** The popup's heading and body. */
  title: string;
  message: string;
  /** A line shown above the radio button (the account's native balance). */
  detail?: string;
  /** The toggle radio button's words ("I understand"); the accepting button stays dimmed until it is on. */
  choiceLabel: string;
  acceptLabel: string;
  rejectLabel: string;
}

/** How long a shown private key stays on screen (docs/design/removeAccountPlan.txt P1). */
export const KEY_SHOW_MS = 30_000;
/** What the key box shows while the key is hidden (the same stars as the Private Key row of the details table). */
const KEY_MASK = '***...***';

export interface MessagePanelRealProps {
  panelId?: SP_COIN_DISPLAY;
  errorMessage: ErrorMessage | undefined;
  renderAccountRow: (entry: MessageAccountEntry, index: number) => ReactNode;
  renderTokenRow: (entry: MessageTokenEntry, index: number) => ReactNode;
  /** Present only while a Merit-authorized write is actually waiting on a person. */
  pendingApproval?: MessagePanelPendingApproval | null;
}

/**
 * 2026-11-11 (owner): the buttons of the Remove Account confirmation: blue at rest; under the mouse green while usable and red while not (a button that cannot be used right now says why in its place: "Password Required").
 * It is not a disabled button (a disabled button gets no mouse events), a press on an unusable one does nothing. Other messages keep their own button look (`light` false).
 */
function ActionButton({ light, usable, onClick, title, whyNot, children }: { light: boolean; usable: boolean; onClick: () => void; title?: string; /** What the button says under the mouse while it cannot be used. */ whyNot?: string; children: ReactNode }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      title={title}
      aria-disabled={!usable}
      onClick={() => { if (usable) onClick(); }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={light ? transactionConfirmPanelStyle.actionButton(usable, hover) : transactionConfirmPanelStyle.button(!usable)}
    >
      {light && hover && !usable && whyNot ? whyNot : children}
    </button>
  );
}

/** The password field + Reject/Approve row — same shape/styling TransactionConfirmPanel.tsx's own password section uses (shared transactionConfirmPanelStyle tokens), kept local here rather than rendering that whole component a second time: this panel already shows the title/accounts/tokens/amount itself via MessageDetailsSection above, so only the decision controls are needed. */
function ApprovalDecisionRow({ pendingApproval, light = false }: { pendingApproval: MessagePanelPendingApproval; /** The message box is the light (yellow) warning: dark text on the field and the buttons. */ light?: boolean }) {
  const { requirePassword, passwordError, busy, onApprove, onReject } = pendingApproval;
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [shownKey, setShownKey] = useState('');
  const [keyError, setKeyError] = useState('');
  const [copied, setCopied] = useState(false);
  const acknowledgements = pendingApproval.acknowledgements ?? [];
  const [acked, setAcked] = useState<Record<string, boolean>>({});
  const [askedId, setAskedId] = useState<string | null>(null);
  const allAcked = acknowledgements.every((a) => acked[a.id]);
  const asking = acknowledgements.find((a) => a.id === askedId);
  const platform = usePlatform();
  const canApprove = !busy && (!requirePassword || password.length > 0) && allAcked;
  useEffect(() => {
    if (!shownKey) return undefined;
    const timer = setTimeout(() => { setShownKey(''); setCopied(false); }, KEY_SHOW_MS);
    return () => clearTimeout(timer);
  }, [shownKey]);
  // 2026-11-11 (owner): while the key is being fetched every other button is unusable (red under the mouse) until the fetch is over
  const [keyBusy, setKeyBusy] = useState(false);
  const havePassword = password.length > 0;
  const keyUsable = !busy && !keyBusy && havePassword;
  const whyKey = busy || keyBusy ? 'Please wait' : 'Password Required';
  const failText = (err: unknown, fallback: string) => (err instanceof Error && err.message ? err.message : fallback);
  const toggleKey = () => {
    if (shownKey) {
      setShownKey('');
      setCopied(false);
      return;
    }
    setKeyError('');
    setKeyBusy(true);
    void pendingApproval.revealKey?.(password).then(setShownKey).catch((err: unknown) => setKeyError(failText(err, 'The key could not be shown.'))).finally(() => setKeyBusy(false));
  };
  // Copy Private Key: fetches the key for the typed password and puts THE KEY on the clipboard (shown or not)
  const copyKey = () => {
    setKeyError('');
    setCopied(false);
    setKeyBusy(true);
    const ask = shownKey ? Promise.resolve(shownKey) : (pendingApproval.revealKey?.(password) ?? Promise.reject(new Error('This wallet cannot show its private key.')));
    void ask
      .then((key) => {
        if (!key) throw new Error('The vault returned no key.');
        return platform.copyText(key).then(() => key);
      })
      .then((key) => {
        setCopied(true);
        scheduleClipboardClear(platform, key);
      })
      .catch((err: unknown) => setKeyError(failText(err, 'The key could not be copied.')))
      .finally(() => setKeyBusy(false));
  };
  return (
    <div className={messagePanelClass.block}>
      {asking && (
        <AcknowledgeDialog
          ack={asking}
          onAccept={() => { setAcked((c) => ({ ...c, [asking.id]: true })); setAskedId(null); }}
          onClose={() => { setAcked((c) => ({ ...c, [asking.id]: false })); setAskedId(null); }}
        />
      )}
      {requirePassword && (
        <div style={transactionConfirmPanelStyle.div12}>
          <div style={dialogStyle.inputWrap}>
            <input
              type={passwordVisible ? 'text' : 'password'}
              autoComplete="current-password"
              aria-label="Wallet password"
              placeholder="Merit Wallet password"
              value={password}
              disabled={busy}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canApprove) onApprove(password);
              }}
              style={light ? transactionConfirmPanelStyle.inputWithEyeLight : transactionConfirmPanelStyle.inputWithEye}
            />
            <button
              type="button"
              onClick={() => setPasswordVisible((v) => !v)}
              aria-label={passwordVisible ? 'Hide password' : 'Show password'}
              title={passwordVisible ? 'Hide password' : 'Show password'}
              style={dialogStyle.eyeButton}
            >
              {passwordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {pendingApproval.revealKey && (
            <>
              <p style={removeAccountStyle.keyBox}>{shownKey || KEY_MASK}</p>
              <div style={transactionConfirmPanelStyle.div14}>
                <ActionButton light={light} usable={shownKey ? !busy && !keyBusy : keyUsable} whyNot={whyKey} onClick={toggleKey}>{shownKey ? 'Hide Private Key' : 'Show Private Key'}</ActionButton>
                <ActionButton light={light} usable={keyUsable} whyNot={whyKey} onClick={copyKey} title="Copy the private key to the clipboard">{copied ? 'Copied' : 'Copy Private Key'}</ActionButton>
              </div>
              {copied ? <div style={transactionConfirmPanelStyle.div13}>Copied. The key leaves the clipboard again in 60 seconds, but until then other programs can read it: paste it somewhere safe now.</div> : null}
              {keyError ? <div style={transactionConfirmPanelStyle.div13}>{keyError}</div> : null}
            </>
          )}
          {acknowledgements.map((a) => (
            <label key={a.id} style={acknowledgeStyle.checkRow}>
              <input
                type="checkbox"
                checked={!!acked[a.id]}
                disabled={busy}
                onChange={() => (acked[a.id] ? setAcked((c) => ({ ...c, [a.id]: false })) : setAskedId(a.id))}
                style={acknowledgeStyle.input}
              />
              {a.label}
            </label>
          ))}
          {passwordError && <div style={transactionConfirmPanelStyle.div13}>{passwordError}</div>}
        </div>
      )}
      <div style={requirePassword ? transactionConfirmPanelStyle.decisionRowAfterControls : transactionConfirmPanelStyle.div14}>
        <ActionButton light={light} usable={!busy && !keyBusy} whyNot="Please wait" onClick={onReject}>
          {pendingApproval.rejectLabel ?? 'Reject'}
        </ActionButton>
        {light ? (
          <ActionButton light usable={canApprove && !keyBusy} whyNot={keyBusy || busy ? 'Please wait' : !havePassword ? 'Password Required' : 'Tick both boxes'} onClick={() => onApprove(requirePassword ? password : undefined)}>
            {busy ? 'Working…' : pendingApproval.approveLabel ?? 'Approve'}
          </ActionButton>
        ) : (
          <button
            type="button"
            onClick={() => onApprove(requirePassword ? password : undefined)}
            disabled={!canApprove}
            style={transactionConfirmPanelStyle.button2(canApprove)}
          >
            {busy ? (pendingApproval.approveLabel ? 'Working…' : 'Signing…') : pendingApproval.approveLabel ?? 'Approve'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function MessagePanelReal({
  panelId = SP_COIN_DISPLAY.MESSAGE_PANEL,
  errorMessage,
  renderAccountRow,
  renderTokenRow,
  pendingApproval,
}: MessagePanelRealProps) {
  const visible = usePanelVisible(panelId);
  const { closePanel } = usePanelTree();
  // 2026-10-06, on request — every message gets a Copy button and a close X in its top right.
  // Copy reads the rendered body (not the header row), so the account/token breakdown is included.
  const bodyRef = useRef<HTMLDivElement>(null);
  const platform = usePlatform();
  const [appChainId] = useAppChainId();
  const [copyLabel, setCopyLabel] = useState('Copy');
  const wrap = useSyncExternalStore(
    errorPanelDisplayStore.subscribe,
    errorPanelDisplayStore.getSnapshot,
    errorPanelDisplayStore.getServerSnapshot,
  );

  // 2026-10-13 (owner request: catch and log this properly): this panel can become visible with NO message behind it (a stale display-stack entry restored by a pop, an open that never set errorMessage). That used to
  // read as a bare "Something went wrong / An unexpected error occurred." Now the box says there was no message and who made it visible, and the same facts go to the console.
  const noMessage = !errorMessage?.msg && !errorMessage?.sections?.length;
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
    : ((errorMessage?.msg ?? '') as string);
  const lines = rawMsg.split('\n');
  const firstLine = lines[0]?.trim() ?? '';
  const body = lines.slice(1).join('\n').replace(/^\n+/, '');
  const title = noMessage
    ? 'No message to show'
    : errorMessage?.title
    ? errorMessage.title
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
          {/* a message with its own heading shows it in the wallet's PANEL_TITLE, not here */}
          <h3 className={messagePanelClass.title}>{kind !== 'warning' && !errorMessage?.title ? title : ''}</h3>
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
            {/* pendingApproval: X rejects the write instead of a bare close — the hook that
                opened this message (useMeritApprovalMessagePanel) keeps it open for as long
                as a decision is outstanding, so a plain close would either leave the write's
                own promise hanging forever or have the panel reopen itself right away. */}
            <SmallYellowButton
              title={pendingApproval ? 'Reject' : 'Close message'}
              aria-label={pendingApproval ? 'Reject' : 'Close message'}
              onClick={() => (pendingApproval ? pendingApproval.onReject() : closePanel(panelId, 'MessagePanel:close'))}
            >
              X
            </SmallYellowButton>
          </div>
        </div>

        <div ref={bodyRef} className={messagePanelClass.body}>
        {bodyHead && (
        <div className={messagePanelClass.block}>
          <p className={messagePanelClass.text(wrap, isUnsupportedNetworkError ? walletPartClass.unsupportedTop : '')}>
            <MessageText text={bodyHead} chainId={appChainId} />
          </p>
        </div>
        )}

        {errorMessage?.sections?.map((section, i) => (
          <CollapsibleSection key={`${section.heading}-${i}`} heading={section.heading} items={section.items} wrap={wrap} defaultOpen={section.defaultOpen} />
        ))}

        <MessageDetailsSection errorMessage={errorMessage} renderAccountRow={renderAccountRow} renderTokenRow={renderTokenRow} />

        {/* 2026-11-11 (owner: the account comes first, then the words): text after the account rows is shown before the decision controls, which close the message */}
        {bodyTail && (
          <div className={messagePanelClass.block}>
            <p className={messagePanelClass.text(wrap)}>
              {bodyTail}
            </p>
          </div>
        )}

        {pendingApproval && <ApprovalDecisionRow pendingApproval={pendingApproval} light={kind === 'warning'} />}

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
