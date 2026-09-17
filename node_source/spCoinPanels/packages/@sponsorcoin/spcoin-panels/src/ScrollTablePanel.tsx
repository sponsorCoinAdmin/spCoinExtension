// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/ScrollTablePanel.tsx
// Ported from the real app's components/views/RadioOverlayPanels/
// ScrollTablePanel.tsx (2026-09-16) — that's the real, single-source-of-
// truth "fixed header + scrollable middle [+ fixed footer]" shell every
// real list screen (DataListSelect, GroupedAccountList, networks.tsx)
// already shares; the portable AssetListTable/AccountListCard/
// NetworkListTable each hardcoded their own separate header/footer/card
// chrome instead of using it — pure duplication with no real app logic in
// this component itself (plain props, no ExchangeContext/wagmi), so it
// moves here and both real and portable list components use this one copy.
//
// Rewritten from Tailwind classes to inline styles — same reasoning as
// every other file in this package (see WalletHeader.tsx's own doc
// comment): a consumer with no Tailwind pipeline (spCoinExtension,
// confirmed this session to have zero Tailwind config) would silently get
// an unstyled/unsized shell otherwise, the exact bug class this session's
// AssetSelectDropDown icon-sizing fix just caught. `bufferPadding` (a real
// CSS padding shorthand) replaces the real component's own
// `bufferClassName` Tailwind-class prop for the same reason.
//
// One real, accepted gap: the real component's `scrollbar-hide` also hides
// the webkit scrollbar via `[&::-webkit-scrollbar]:hidden`, which needs an
// actual stylesheet rule (a pseudo-element isn't stylable via inline
// style) — this package injects no <style> tags anywhere, so a Chrome/
// Safari consumer with no Tailwind (the extension) will show a plain
// visible scrollbar here. `scrollbarWidth`/`msOverflowStyle` (real inline-
// stylable properties) are still applied, so Firefox/legacy Edge still
// hide it. Cosmetic only, not a functional gap — not worth a bigger fix.

'use client';

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

export default function ScrollTablePanel({
  id,
  header,
  footer,
  style,
  bufferPadding = '3px 12px',
  bodyRef,
  bodyStyle,
  children,
}: ScrollTablePanelProps) {
  return (
    <div style={{ display: 'flex', minHeight: 0, flex: 1, flexDirection: 'column', overflow: 'hidden', padding: bufferPadding }}>
      <div id={id} style={{ display: 'flex', minHeight: 0, flex: 1, flexDirection: 'column', overflow: 'hidden', ...style }}>
        {header}
        <div
          ref={bodyRef}
          style={{
            minHeight: 0,
            flex: 1,
            overflowY: 'auto',
            overflowX: 'auto',
            msOverflowStyle: 'none',
            scrollbarWidth: 'none',
            ...bodyStyle,
          }}
        >
          {children}
        </div>
        {footer}
      </div>
    </div>
  );
}
