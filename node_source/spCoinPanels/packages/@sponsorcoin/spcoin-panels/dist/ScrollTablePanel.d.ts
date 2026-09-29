import React from 'react';
export interface ScrollTablePanelProps {
    id?: string;
    /** Rendered above the scroll region — a plain flex sibling, never
     *  scrolled. */
    header: React.ReactNode;
    /** Rendered below the scroll region — same idea, e.g. a Total row. */
    footer?: React.ReactNode;
    /** Extra inline styles for the OUTER box: rounded corners, border,
     *  background. */
    style?: React.CSSProperties;
    /** CSS padding shorthand for the outer buffer — defaults to the real
     *  app's own default ('3px 12px', i.e. 3px top/bottom, 12px sides,
     *  matching that component's `px-3 pt-[3px] pb-[3px]`). Pass '3px' for
     *  the tighter uniform buffer GroupedAccountList/networks.tsx use. */
    bufferPadding?: string;
    /** Forwarded to the actual scrolling middle div — for measuring/
     *  observing scroll position. */
    bodyRef?: React.Ref<HTMLDivElement>;
    /** Extra inline styles merged onto the scrolling middle div. */
    bodyStyle?: React.CSSProperties;
    children: React.ReactNode;
}
export default function ScrollTablePanel({ id, header, footer, style, bufferPadding, bodyRef, bodyStyle, children, }: ScrollTablePanelProps): React.JSX.Element;
