// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/MeritPanelGate.tsx
// (moved from node_source/spCoinPanels/engine/, 2026-09-10 — see index.ts's
// own comment for why)
//
// Merit's own independent panel-gating component — a near-direct copy of
// the app's existing components/utility/PanelGate.tsx (that pattern was
// already clean and proven; only the source it read from needed to
// change), bound to this engine's usePanelVisible instead of the app's.
//
// Built specifically because it was the real blocker for migrating any
// further Merit-exclusive panel: even a genuinely Merit-only panel ID
// still renders wrong if the component gating its visibility (PanelGate)
// reads the old engine while something else writes the new one — see
// docs/design/extensionPlan.md §7's "Real bug found and fixed" note for
// exactly this failure mode happening once already, on a component that
// didn't even use PanelGate.

'use client';

import React from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { usePanelVisible } from './usePanelVisible';

interface Props {
  panel: SP_COIN_DISPLAY;
  children: React.ReactNode;
  /** if true (default), children are only mounted when the panel is visible. */
  lazyLoad?: boolean;
  /** @deprecated Use `lazyLoad={false}` instead. */
  mountAlways?: boolean;
  className?: string;
}

export default function MeritPanelGate({
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
