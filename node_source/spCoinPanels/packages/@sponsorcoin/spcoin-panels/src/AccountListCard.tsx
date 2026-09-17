// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/AccountListCard.tsx
// Portable version of the real app's GroupedAccountList.tsx + the "Add a
// Wallet/Account" button from AccountManagementPanel.tsx (2026-09-15) — the
// LOCAL_ACCOUNT_WALLET_LIST screen ("Active Account Selection"). Every
// sizing value below (rounded-[20px] card, 34px button/14px font/8px
// radius, 101px status-badge width, row height/padding via AssetListRow)
// is copied from those files' own dated comments — not re-guessed.
// Placeholder: static `groups` data, per-group collapse toggle is real
// (pure UI, matches the real component's own "no caller needs it" design),
// no real account-selection/MetaMask-connect logic behind any of it.

'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import AssetListRow, { type AssetListRowProps } from './AssetListRow';
import ScrollTablePanel from './ScrollTablePanel';

export interface AccountListEntry extends Omit<AssetListRowProps, 'badge'> {
  id: string;
  /** This row is the group/app's currently active account — renders the
   *  same green "ACTIVE" tag AccountRow.tsx's own isActiveMarker does. */
  isActive?: boolean;
  /** Convenience alternative to `icon` — a resolved image URL/data URL
   *  that MeritWallet.tsx turns into an actual <img> itself, same
   *  convention as MeritWalletNetworkRow.iconSrc (this package's own
   *  network-row equivalent). Ignored when `icon` is already given. */
  iconSrc?: string;
}

export interface AccountListGroup {
  id: string;
  /** "Merit Wallet" / "MetaMask" / "Watch-only" — GroupedAccountList.tsx's
   *  own GROUP_LABEL values. */
  label: string;
  /** Whether this group is the app's current active source — drives the
   *  Active(green)/Inactive(red) status badge. */
  isActiveSource: boolean;
  /** When provided (typically only the MetaMask-style group) and
   *  `!isActiveSource`, the status badge becomes a clickable "Connect"
   *  button instead of a plain "Inactive" label — matches
   *  GroupedAccountList.tsx's own metaMaskHeaderBadge prop. */
  connectLabel?: string;
  onConnectClick?: () => void;
  accounts: AccountListEntry[];
}

export interface AccountListCardProps {
  groups: AccountListGroup[];
  onAddWalletAccount?: () => void;
  infoIconSrc?: string;
}

const STATUS_BADGE_STYLE: React.CSSProperties = {
  display: 'flex',
  width: 101,
  flexShrink: 0,
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0 12px',
  textAlign: 'center',
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#ffffff',
  border: 'none',
  height: 28,
  boxSizing: 'border-box',
};

function GroupHeader({ group, collapsed, onToggle }: { group: AccountListGroup; collapsed: boolean; onToggle: () => void }) {
  const showConnect = !group.isActiveSource && group.connectLabel;
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', background: '#2b2b2b' }}>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={collapsed}
        title={collapsed ? 'Show all accounts' : 'Show only the active account'}
        style={{
          display: 'flex',
          minWidth: 0,
          flex: 1,
          alignItems: 'center',
          gap: 4,
          padding: '8px 12px',
          background: 'transparent',
          border: 'none',
          fontSize: 12,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.03em',
          color: 'rgba(203,213,225,0.8)',
          cursor: 'pointer',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.label}</span>
        {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
      </button>
      {showConnect ? (
        <button
          type="button"
          onClick={group.onConnectClick}
          style={{ ...STATUS_BADGE_STYLE, background: '#16a34a', cursor: 'pointer' }}
        >
          {group.connectLabel}
        </button>
      ) : (
        <span style={{ ...STATUS_BADGE_STYLE, background: group.isActiveSource ? '#16a34a' : '#dc2626' }}>
          {group.isActiveSource ? 'Active' : 'Inactive'}
        </span>
      )}
    </div>
  );
}

export default function AccountListCard({ groups, onAddWalletAccount, infoIconSrc }: AccountListCardProps) {
  // Seeded (mount-only) into active-only mode for every group except the
  // currently active source — matches GroupedAccountList.tsx's own
  // useState initializer exactly (an inactive group reads as collapsed on
  // first open; purely a starting point after that, real toggle state
  // from here on).
  const [activeOnlyGroups, setActiveOnlyGroups] = useState<Set<string>>(
    () => new Set(groups.filter((g) => !g.isActiveSource).map((g) => g.id)),
  );
  const toggleGroup = (id: string) => {
    setActiveOnlyGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1, gap: 4 }}>
      {/* 2026-09-16, on request — borderRadius 12 (was 20) + a real
          visible border, same container treatment already applied to
          NetworkListTable.tsx/AssetListTable.tsx. bufferPadding="3px" —
          NOT "0": the real GroupedAccountList.tsx's own ScrollTablePanel
          usage passes bufferClassName="p-[3px]" (confirmed by direct
          read), a real, different value from DataListSelect.tsx's flush
          treatment — matched here, not borrowed from the Rewards table's
          own separate 8px margin, which belongs to a different real
          component. header={null} — no single fixed header here (each
          group draws its own inline GroupHeader inside the scroll
          region), matching the real component's own usage exactly. */}
      <ScrollTablePanel
        header={null}
        bufferPadding="3px"
        style={{ borderRadius: 12, border: '1px solid #334155', background: '#243056', color: '#5981F3', boxSizing: 'border-box' }}
      >
        {groups.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>
            No accounts yet — add one below.
          </div>
        ) : (
          groups.map((group, groupIndex) => {
            const collapsed = activeOnlyGroups.has(group.id);
            const visibleAccounts = collapsed ? group.accounts.filter((a) => a.isActive) : group.accounts;
            return (
              <div key={group.id} style={{ borderTop: groupIndex > 0 ? '1px solid #2e3654' : undefined }}>
                <GroupHeader group={group} collapsed={collapsed} onToggle={() => toggleGroup(group.id)} />
                {visibleAccounts.map((account, i) => (
                  <div key={account.id} style={{ background: i % 2 === 0 ? 'rgba(56,78,126,0.35)' : 'rgba(156,163,175,0.25)' }}>
                    <AssetListRow
                      {...account}
                      infoIconSrc={infoIconSrc}
                      badge={
                        account.isActive ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              borderRadius: 4,
                              background: '#16a34a',
                              padding: '2px 6px',
                              fontSize: 10,
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.08em',
                              color: '#ffffff',
                            }}
                          >
                            Active
                          </span>
                        ) : undefined
                      }
                    />
                  </div>
                ))}
              </div>
            );
          })
        )}
      </ScrollTablePanel>
      {/* "Add a Wallet/Account" — matches AccountManagementPanel.tsx's own
          same-day-measured button exactly (min-h/max-h 34px, text-[14px],
          rounded-[8px] — see that file's own comment for the 0.68x-ratio
          measurement this came from). */}
      <button
        type="button"
        onClick={onAddWalletAccount}
        style={{
          minHeight: 34,
          maxHeight: 34,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          borderRadius: 8,
          border: 'none',
          background: '#243056',
          color: '#5981F3',
          fontSize: 14,
          fontWeight: 700,
          cursor: onAddWalletAccount ? 'pointer' : 'default',
        }}
      >
        Add a Wallet/Account
      </button>
    </div>
  );
}
