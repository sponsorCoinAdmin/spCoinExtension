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
import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { usePlatform } from '../platform/platform';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
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
function MessageText({ text, chainId }) {
    const lines = text.split('\n');
    return (_jsx(_Fragment, { children: lines.map((line, i) => {
            const newline = i < lines.length - 1 ? '\n' : '';
            const match = /^(Contract: )(0x[0-9a-fA-F]{40})\s*$/.exec(line);
            if (!match)
                return _jsxs(React.Fragment, { children: [line, newline] }, i);
            // a row of its own (its end is the line break, so no newline follows it)
            return (_jsxs("span", { style: messageContractLogoStyle.row, children: [_jsx("span", { style: messageContractLogoStyle.box, children: _jsx(TokenLogo, { address: match[2], chainId: chainId, className: "", style: messageContractLogoStyle.img }) }), _jsxs("span", { style: messageContractLogoStyle.text, children: [match[1], match[2]] })] }, i));
        }) }));
}
/** 2026-11-11 (owner): a heading that is a link; clicking it expands / collapses its explanation (all start collapsed). A section's text is copied by Copy only while it is open (Copy reads the rendered body). */
function CollapsibleSection({ heading, items, wrap, defaultOpen }) {
    const [open, setOpen] = useState(!!defaultOpen);
    return (_jsxs("div", { className: messagePanelClass.block, children: [_jsxs("button", { type: "button", onClick: () => setOpen((o) => !o), "aria-expanded": open, style: collapsibleSectionStyle.heading, children: [_jsx("span", { "aria-hidden": "true", children: open ? '▾' : '▸' }), " ", heading] }), open && (_jsx("ul", { className: messagePanelClass.text(wrap), style: collapsibleSectionStyle.list, children: items.map((item, i) => _jsx("li", { style: collapsibleSectionStyle.item, children: item }, i)) }))] }));
}
const collapsibleSectionStyle = {
    heading: { background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'inherit', font: 'inherit', fontWeight: 700, textDecoration: 'underline', textAlign: 'left' },
    list: { margin: '6px 0 0 0', paddingLeft: 22, listStyleType: 'disc', whiteSpace: 'normal' },
    item: { margin: '0 0 4px 0' },
};
/** How long a shown private key stays on screen (docs/design/removeAccountPlan.txt P1). */
export const KEY_SHOW_MS = 30000;
/** What the key box shows while the key is hidden (the same stars as the Private Key row of the details table). */
const KEY_MASK = '***...***';
/**
 * 2026-11-11 (owner): the buttons of the Remove Account confirmation: blue at rest; under the mouse green while usable and red while not (a button that cannot be used right now says why in its place: "Password Required").
 * It is not a disabled button (a disabled button gets no mouse events), a press on an unusable one does nothing. Other messages keep their own button look (`light` false).
 */
function ActionButton({ light, usable, onClick, title, whyNot, children }) {
    const [hover, setHover] = useState(false);
    return (_jsx("button", { type: "button", title: title, "aria-disabled": !usable, onClick: () => { if (usable)
            onClick(); }, onMouseEnter: () => setHover(true), onMouseLeave: () => setHover(false), style: light ? transactionConfirmPanelStyle.actionButton(usable, hover) : transactionConfirmPanelStyle.button(!usable), children: light && hover && !usable && whyNot ? whyNot : children }));
}
/** The password field + Reject/Approve row — same shape/styling TransactionConfirmPanel.tsx's own password section uses (shared transactionConfirmPanelStyle tokens), kept local here rather than rendering that whole component a second time: this panel already shows the title/accounts/tokens/amount itself via MessageDetailsSection above, so only the decision controls are needed. */
function ApprovalDecisionRow({ pendingApproval, light = false }) {
    const { requirePassword, passwordError, busy, onApprove, onReject } = pendingApproval;
    const [password, setPassword] = useState('');
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [shownKey, setShownKey] = useState('');
    const [keyError, setKeyError] = useState('');
    const [copied, setCopied] = useState(false);
    const acknowledgements = pendingApproval.acknowledgements ?? [];
    const [acked, setAcked] = useState({});
    const [askedId, setAskedId] = useState(null);
    const allAcked = acknowledgements.every((a) => acked[a.id]);
    const asking = acknowledgements.find((a) => a.id === askedId);
    const platform = usePlatform();
    const canApprove = !busy && (!requirePassword || password.length > 0) && allAcked;
    useEffect(() => {
        if (!shownKey)
            return undefined;
        const timer = setTimeout(() => { setShownKey(''); setCopied(false); }, KEY_SHOW_MS);
        return () => clearTimeout(timer);
    }, [shownKey]);
    // 2026-11-11 (owner): while the key is being fetched every other button is unusable (red under the mouse) until the fetch is over
    const [keyBusy, setKeyBusy] = useState(false);
    const havePassword = password.length > 0;
    const keyUsable = !busy && !keyBusy && havePassword;
    const whyKey = busy || keyBusy ? 'Please wait' : 'Password Required';
    const failText = (err, fallback) => (err instanceof Error && err.message ? err.message : fallback);
    const toggleKey = () => {
        if (shownKey) {
            setShownKey('');
            setCopied(false);
            return;
        }
        setKeyError('');
        setKeyBusy(true);
        void pendingApproval.revealKey?.(password).then(setShownKey).catch((err) => setKeyError(failText(err, 'The key could not be shown.'))).finally(() => setKeyBusy(false));
    };
    // Copy Private Key: fetches the key for the typed password and puts THE KEY on the clipboard (shown or not)
    const copyKey = () => {
        setKeyError('');
        setCopied(false);
        setKeyBusy(true);
        const ask = shownKey ? Promise.resolve(shownKey) : (pendingApproval.revealKey?.(password) ?? Promise.reject(new Error('This wallet cannot show its private key.')));
        void ask
            .then((key) => {
            if (!key)
                throw new Error('The vault returned no key.');
            return platform.copyText(key).then(() => key);
        })
            .then((key) => {
            setCopied(true);
            scheduleClipboardClear(platform, key);
        })
            .catch((err) => setKeyError(failText(err, 'The key could not be copied.')))
            .finally(() => setKeyBusy(false));
    };
    return (_jsxs("div", { className: messagePanelClass.block, children: [asking && (_jsx(AcknowledgeDialog, { ack: asking, onAccept: () => { setAcked((c) => ({ ...c, [asking.id]: true })); setAskedId(null); }, onClose: () => { setAcked((c) => ({ ...c, [asking.id]: false })); setAskedId(null); } })), requirePassword && (_jsxs("div", { style: transactionConfirmPanelStyle.div12, children: [_jsxs("div", { style: dialogStyle.inputWrap, children: [_jsx("input", { type: passwordVisible ? 'text' : 'password', autoComplete: "current-password", "aria-label": "Wallet password", placeholder: "Merit Wallet password", value: password, disabled: busy, onChange: (e) => setPassword(e.target.value), onKeyDown: (e) => {
                                    if (e.key === 'Enter' && canApprove)
                                        onApprove(password);
                                }, style: light ? transactionConfirmPanelStyle.inputWithEyeLight : transactionConfirmPanelStyle.inputWithEye }), _jsx("button", { type: "button", onClick: () => setPasswordVisible((v) => !v), "aria-label": passwordVisible ? 'Hide password' : 'Show password', title: passwordVisible ? 'Hide password' : 'Show password', style: dialogStyle.eyeButton, children: passwordVisible ? _jsx(EyeOff, { size: 16 }) : _jsx(Eye, { size: 16 }) })] }), pendingApproval.revealKey && (_jsxs(_Fragment, { children: [_jsx("p", { style: removeAccountStyle.keyBox, children: shownKey || KEY_MASK }), _jsxs("div", { style: transactionConfirmPanelStyle.div14, children: [_jsx(ActionButton, { light: light, usable: shownKey ? !busy && !keyBusy : keyUsable, whyNot: whyKey, onClick: toggleKey, children: shownKey ? 'Hide Private Key' : 'Show Private Key' }), _jsx(ActionButton, { light: light, usable: keyUsable, whyNot: whyKey, onClick: copyKey, title: "Copy the private key to the clipboard", children: copied ? 'Copied' : 'Copy Private Key' })] }), copied ? _jsx("div", { style: transactionConfirmPanelStyle.div13, children: "Copied. The key leaves the clipboard again in 60 seconds, but until then other programs can read it: paste it somewhere safe now." }) : null, keyError ? _jsx("div", { style: transactionConfirmPanelStyle.div13, children: keyError }) : null] })), acknowledgements.map((a) => (_jsxs("label", { style: acknowledgeStyle.checkRow, children: [_jsx("input", { type: "checkbox", checked: !!acked[a.id], disabled: busy, onChange: () => (acked[a.id] ? setAcked((c) => ({ ...c, [a.id]: false })) : setAskedId(a.id)), style: acknowledgeStyle.input }), a.label] }, a.id))), passwordError && _jsx("div", { style: transactionConfirmPanelStyle.div13, children: passwordError })] })), _jsxs("div", { style: requirePassword ? transactionConfirmPanelStyle.decisionRowAfterControls : transactionConfirmPanelStyle.div14, children: [_jsx(ActionButton, { light: light, usable: !busy && !keyBusy, whyNot: "Please wait", onClick: onReject, children: pendingApproval.rejectLabel ?? 'Reject' }), light ? (_jsx(ActionButton, { light: true, usable: canApprove && !keyBusy, whyNot: keyBusy || busy ? 'Please wait' : !havePassword ? 'Password Required' : 'Tick both boxes', onClick: () => onApprove(requirePassword ? password : undefined), children: busy ? 'Working…' : pendingApproval.approveLabel ?? 'Approve' })) : (_jsx("button", { type: "button", onClick: () => onApprove(requirePassword ? password : undefined), disabled: !canApprove, style: transactionConfirmPanelStyle.button2(canApprove), children: busy ? (pendingApproval.approveLabel ? 'Working…' : 'Signing…') : pendingApproval.approveLabel ?? 'Approve' }))] })] }));
}
export default function MessagePanelReal({ panelId = SP_COIN_DISPLAY.MESSAGE_PANEL, errorMessage, renderAccountRow, renderTokenRow, pendingApproval, }) {
    const visible = usePanelVisible(panelId);
    const { closePanel } = usePanelTree();
    // 2026-10-06, on request — every message gets a Copy button and a close X in its top right.
    // Copy reads the rendered body (not the header row), so the account/token breakdown is included.
    const bodyRef = useRef(null);
    const platform = usePlatform();
    const [appChainId] = useAppChainId();
    const [copyLabel, setCopyLabel] = useState('Copy');
    const wrap = useSyncExternalStore(errorPanelDisplayStore.subscribe, errorPanelDisplayStore.getSnapshot, errorPanelDisplayStore.getServerSnapshot);
    // 2026-10-13 (owner request: catch and log this properly): this panel can become visible with NO message behind it (a stale display-stack entry restored by a pop, an open that never set errorMessage). That used to
    // read as a bare "Something went wrong / An unexpected error occurred." Now the box says there was no message and who made it visible, and the same facts go to the console.
    const noMessage = !errorMessage?.msg && !errorMessage?.sections?.length;
    const openedBy = noMessage && visible ? getPanelOpenLog(panelId, 3).map((record) => describePanelOpen(record)) : [];
    useEffect(() => {
        if (!visible || !noMessage)
            return;
        // eslint-disable-next-line no-console
        console.warn('[MESSAGE_PANEL] shown with no message', { openedBy: getPanelOpenLog(panelId, 5), errorMessage });
    }, [visible, noMessage, panelId, errorMessage]);
    if (!visible)
        return null;
    const kind = classifyMessageStatus(errorMessage?.status, errorMessage?.msg);
    const isUnsupportedNetworkError = kind === 'error' && errorMessage?.source === 'useNetworkController:onChainChanged';
    const rawMsg = noMessage
        ? ['This panel was opened without a message.', ...(openedBy.length ? openedBy : ['No record of what opened it (see the console for details).'])].join('\n')
        : (errorMessage?.msg ?? '');
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
    const hasDetailsBlock = Boolean(errorMessage?.accounts?.length || errorMessage?.tokens?.length || errorMessage?.amount || errorMessage?.reason || errorMessage?.gasFee);
    const markerIndex = hasDetailsBlock ? bodyText.indexOf(MESSAGE_ACCOUNTS_MARKER) : -1;
    const bodyHead = markerIndex >= 0 ? bodyText.slice(0, markerIndex).replace(/\n+$/, '') : bodyText;
    const bodyTail = markerIndex >= 0 ? bodyText.slice(markerIndex + MESSAGE_ACCOUNTS_MARKER.length).replace(/^\n+/, '') : '';
    const hasSource = Boolean(errorMessage?.source);
    const styles = MESSAGE_STATUS_STYLES[kind];
    return (_jsx("div", { className: messagePanelClass.outer, children: _jsxs("div", { id: "MESSAGE_PANEL", className: messagePanelClass.box(isUnsupportedNetworkError, styles.border, styles.bg, styles.text), role: kind === 'error' ? 'alert' : 'status', "aria-live": kind === 'error' ? 'assertive' : 'polite', children: [_jsxs("div", { className: messagePanelClass.titleRow, children: [_jsx("h3", { className: messagePanelClass.title, children: kind !== 'warning' && !errorMessage?.title ? title : '' }), _jsxs("div", { className: messagePanelClass.buttons, children: [_jsx(SmallYellowButton, { title: "Copy message", onClick: async () => {
                                        const text = `${kind !== 'warning' ? `${title}
` : ''}${bodyRef.current?.innerText ?? rawMsg}`;
                                        try {
                                            await platform.copyText(text);
                                            setCopyLabel('Copied');
                                            setTimeout(() => setCopyLabel('Copy'), 1400);
                                        }
                                        catch {
                                            setCopyLabel('Copy Failed');
                                            setTimeout(() => setCopyLabel('Copy'), 1800);
                                        }
                                    }, children: copyLabel }), _jsx(SmallYellowButton, { title: pendingApproval ? 'Reject' : 'Close message', "aria-label": pendingApproval ? 'Reject' : 'Close message', onClick: () => (pendingApproval ? pendingApproval.onReject() : closePanel(panelId, 'MessagePanel:close')), children: "X" })] })] }), _jsxs("div", { ref: bodyRef, className: messagePanelClass.body, children: [bodyHead && (_jsx("div", { className: messagePanelClass.block, children: _jsx("p", { className: messagePanelClass.text(wrap, isUnsupportedNetworkError ? walletPartClass.unsupportedTop : ''), children: _jsx(MessageText, { text: bodyHead, chainId: appChainId }) }) })), errorMessage?.sections?.map((section, i) => (_jsx(CollapsibleSection, { heading: section.heading, items: section.items, wrap: wrap, defaultOpen: section.defaultOpen }, `${section.heading}-${i}`))), _jsx(MessageDetailsSection, { errorMessage: errorMessage, renderAccountRow: renderAccountRow, renderTokenRow: renderTokenRow }), bodyTail && (_jsx("div", { className: messagePanelClass.block, children: _jsx("p", { className: messagePanelClass.text(wrap), children: bodyTail }) })), pendingApproval && _jsx(ApprovalDecisionRow, { pendingApproval: pendingApproval, light: kind === 'warning' }), hasSource && (_jsx("div", { className: messagePanelClass.source, children: errorMessage?.source && (_jsxs("div", { children: [_jsx("span", { className: messagePanelClass.sourceLabel, children: "Source:" }), " ", errorMessage.source] })) }))] })] }) }));
}
