// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/PanelGate.tsx
//
// 2026-09-21, Path A ("single source of truth so path a is the way") —
// the real replacement for MeritPanelGate.tsx/panelState.ts's own
// deliberately-separate meritPanelState. This gate reads the SAME
// @sponsorcoin/spcoin-exchange-engine usePanelVisible the web app uses —
// same code, not a second implementation kept in sync by hand. A
// consumer still gets its own genuinely independent RUNTIME instance
// (separate JS process/bundle — the extension and the web app never
// share a module registry), matching the standalone-first architecture
// decision; only the CODE is now shared, not the state.
//
// usePanelVisible reads straight from the module-level `panelStore`
// singleton — no Provider needed for the read itself. What DOES need a
// Provider ancestor: something in the tree must call the full
// usePanelTree() hook at least once, since that's where the
// republish-from-ExchangeContext effect that keeps panelStore in sync
// actually lives (confirmed by reading usePanelTree.ts directly, not
// assumed) — PanelBootstrap already does this internally, and every
// real consumer of this component (the extension's sidepanel.ts, the
// web app's own tree) already mounts PanelBootstrap/usePanelTree
// somewhere above it.
//
// Structurally identical to MeritPanelGate.tsx/the web app's own
// components/utility/PanelGate.tsx — only the import source changed,
// same as those two files' own relationship to each other.

'use client';

import React from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { usePanelVisible } from '@sponsorcoin/spcoin-exchange-engine';

interface Props {
  panel: SP_COIN_DISPLAY;
  children: React.ReactNode;
  /** if true (default), children are only mounted when the panel is visible. */
  lazyLoad?: boolean;
  /** @deprecated Use `lazyLoad={false}` instead. */
  mountAlways?: boolean;
  className?: string;
}

export default function PanelGate({
  panel,
  children,
  lazyLoad,
  mountAlways,
  className,
}: Props) {
  const resolvedLazy =
    typeof lazyLoad === 'boolean'
      ? lazyLoad
      : typeof mountAlways === 'boolean'
      ? !mountAlways
      : true; // default: lazy load

  const visible = usePanelVisible(panel);

  // Lazy path: don't even mount when hidden
  if (resolvedLazy && !visible) return null;

  // Non-lazy path: keep mounted; hide when not visible
  const wrapperClass =
    !resolvedLazy && !visible
      ? ['hidden', className].filter(Boolean).join(' ')
      : className ?? '';

  return (
    <div
      data-panel={SP_COIN_DISPLAY[panel]}
      data-visible={visible ? 'true' : 'false'}
      className={wrapperClass}
    >
      {children}
    </div>
  );
}
