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
import type { PanelId } from './panelState';

interface Props {
  // 2026-09-14 — widened from SP_COIN_DISPLAY to PanelId (see
  // panelState.ts's own doc comment) so this gate also accepts the new
  // Merit-only string-literal panel ids (MERIT_REWARDS_SUMMARY/
  // MERIT_REWARDS_PENDING), not just real SP_COIN_DISPLAY members.
  panel: PanelId;
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

  // A real SP_COIN_DISPLAY member (number) reverse-looks-up its name via
  // the enum object; a Merit-only id is already its own plain string
  // label, no lookup needed or possible (SP_COIN_DISPLAY has no entry for
  // it).
  const panelLabel = typeof panel === 'number' ? SP_COIN_DISPLAY[panel] : panel;

  return (
    <div
      data-panel={panelLabel}
      data-visible={visible ? 'true' : 'false'}
      className={wrapperClass}
    >
      {children}
    </div>
  );
}
