// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/NetworkListTable.tsx
// Portable version of the real app's networks.tsx (2026-09-15) —
// NETWORK_LIST's own distinct card shell, the third and last
// ACTIVE_LIST_PANEL_MODES layout (REMOTE_TOKEN_LIST/REMOTE_ACCOUNT_*
// share AssetListTable.tsx; LOCAL_ACCOUNT_WALLET_LIST has its own
// AccountListCard.tsx; this is NETWORK_LIST's). Header reads "Network
// Meta | Auth Source / Status" (not "Token Meta | Info" — a real,
// different header, not a relabeled copy) and the footer carries the
// "Show Test Nets" checkbox networks.tsx's own ScrollTablePanel footer
// slot renders — both copied from that file's own real values, not
// re-guessed. Placeholder: `rows` is caller-supplied static data, no
// real network feed/switch logic behind it.

'use client';

import React from 'react';
import NetworkListRow, { type NetworkListRowProps } from './NetworkListRow';
import ScrollTablePanel from './ScrollTablePanel';

// Same rowA/rowB zebra constants AssetListTable.tsx already exports —
// duplicated here (not imported) so this file has no dependency on that
// sibling table's own module, matching every other pair of "distinct but
// same-family" components in this package (e.g. AssetListRow vs.
// NetworkListRow themselves).
export const NETWORK_LIST_ROW_BG_A = 'rgba(56,78,126,0.35)';
export const NETWORK_LIST_ROW_BG_B = 'rgba(156,163,175,0.25)';

export interface NetworkListEntry extends NetworkListRowProps {
  /** React key — typically the row's own chainId. */
  id: string;
}

export interface NetworkListTableProps {
  rows: NetworkListEntry[];
  showTestNets?: boolean;
  onToggleShowTestNets?: () => void;
  loadingText?: string;
  emptyText?: string;
  loading?: boolean;
}

export default function NetworkListTable({
  rows,
  showTestNets = false,
  onToggleShowTestNets,
  loadingText = 'Loading…',
  emptyText = 'No results.',
  loading = false,
}: NetworkListTableProps) {
  const header = (
    // 2026-09-16, on request ("apply the text/row/style/size from [the
    // Rewards Management table] to Select Network") — header padding/font
    // now match ManageSponsorshipsPanel.tsx's own header row exactly
    // (padding '5px 10px', fontSize 9, fontWeight 700, no uppercase/
    // letterSpacing, color #94a3b8) instead of this table's own prior,
    // separately-tuned values.
    <div style={{ background: '#2b2b2b', borderBottom: '1px solid #000000' }}>
      <div style={{ width: '100%', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, padding: '5px 10px' }}>
        <div style={{ flexShrink: 0, textAlign: 'left', fontSize: 9, fontWeight: 700, color: '#94a3b8' }}>
          Network Meta
        </div>
        <div style={{ flexShrink: 0, textAlign: 'right', fontSize: 9, fontWeight: 700, color: '#94a3b8' }}>
          Auth Source
        </div>
      </div>
    </div>
  );

  const footer = (
    // 2026-09-16, on request ("'Show Test Nets' row is way out of scale,
    // should be the same text scale as the header") — fontSize 14→9,
    // padding tightened to match the header's own '5px 10px' scale
    // (was '12px 16px', sized for the old 36px-row scale). Checkbox
    // shrunk to match (was 16px, oversized next to 9px text).
    <div
      style={{
        display: 'flex',
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTop: '1px solid rgba(51,65,85,0.7)',
        padding: '5px 10px',
        fontSize: 9,
        color: '#cbd5e1',
      }}
    >
      <span>Show Test Nets</span>
      <input
        type="checkbox"
        checked={showTestNets}
        onChange={onToggleShowTestNets}
        aria-label="Show Test Nets"
        style={{ height: 11, width: 11, cursor: onToggleShowTestNets ? 'pointer' : 'default', accentColor: '#5981F3' }}
      />
    </div>
  );

  return (
    // 2026-09-16, on request — container now matches
    // ManageSponsorshipsPanel.tsx's own outer treatment exactly:
    // borderRadius 12 (was 20), a real visible border (was none — pure
    // black on this near-black page background reads as no border at
    // all), and '0 8px 8px 8px' outer breathing room (was flush/0) —
    // same reasoning as that file's own comment on why margin was added.
    <ScrollTablePanel
      header={header}
      footer={footer}
      bufferPadding="0 8px 8px 8px"
      style={{ borderRadius: 12, border: '1px solid #334155', background: '#243056', color: '#5981F3', boxSizing: 'border-box' }}
    >
      {loading ? (
        <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>{loadingText}</div>
      ) : rows.length === 0 ? (
        <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>{emptyText}</div>
      ) : (
        // 2026-09-16, on request ("make the extension network rows display
        // like [the already-correct ordering]") — pins isActive row(s) to
        // the top structurally, regardless of the order `rows` arrives in.
        // Previously this table just rendered `rows` as-given, so whether
        // the active network showed first depended entirely on the
        // caller's own data order — the web app's networks.tsx happened to
        // list it first, the extension's own sample data didn't, so the
        // exact same component looked inconsistent across the two
        // surfaces. Sorting here (not in each consumer) makes this correct
        // for every current and future caller, matching the single-
        // source-of-truth intent of this package.
        [...rows]
          .sort((a, b) => (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0))
          .map((row, i) => (
            <div key={row.id} style={{ background: row.isActive ? undefined : i % 2 === 0 ? NETWORK_LIST_ROW_BG_A : NETWORK_LIST_ROW_BG_B }}>
              <NetworkListRow {...row} groupId={row.groupId ?? 'network-list'} />
            </div>
          ))
      )}
    </ScrollTablePanel>
  );
}
