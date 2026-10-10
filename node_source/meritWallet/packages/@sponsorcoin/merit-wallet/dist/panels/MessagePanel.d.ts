import React from 'react';
export type MessageKind = 'error' | 'warning' | 'success' | 'info' | 'trace';
export interface MessagePanelProps {
    /** Drives border/background/text color and the default title. Defaults
     *  to 'info' — the least alarming default for a component with nothing
     *  real to report yet. */
    kind?: MessageKind;
    /** Overrides the kind-derived default title. Pass '' to force no heading
     *  (matches the real app's own warning-kind behavior). */
    title?: string;
    /** Body text. */
    message?: string;
    /** Shown as a small "Source: ..." line at the bottom when given — matches
     *  the real app's own debug-friendly source tag. */
    source?: string;
    /** Matches the real app's own wrap-toggle default (true — long-word
     *  wrapping on). */
    wrap?: boolean;
}
export default function MessagePanel({ kind, title, message, source, wrap, }: MessagePanelProps): React.JSX.Element;
