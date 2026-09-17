// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/WalletAccountHeader.tsx
// Portable placeholder for WALLET_ACCOUNT_HEADER (2026-09-12) — the real
// app version (components/views/Headers/PanelSubTitle.tsx) renders
// AccountSelectDropDown (a real account + avatar + panel-tree-driven
// picker) and RoleTableComponent (a LIVE server fetch against on-chain
// account-role data via /api/spCoin/run-script, real ExchangeContext
// network/RPC state). Neither has any real data to show yet in a
// consumer with no account/chain connection at all (the extension,
// today) — there's no meaningful "ported" version of a live on-chain
// read with nothing to read. This is the same shape, same layout,
// entirely inert: an unselected-account row + three permanently-red role
// badges, all via injected props with safe do-nothing defaults, exactly
// the "presentation only, no sync yet" scope every other extension-bound
// component in this package has followed so far.
//
// 2026-09-16, on request ("the AccountSelectDropDown should be like the
// NetworkSelectDropDown in the grey header bar", plus a live report that
// the icon never showed, the address never truncated, and the row wasn't
// actually collapsible) — this used to hand-roll its own icon+name+
// address+chevron JSX from scratch, duplicating (and drifting from) what
// AssetSelectDropDown already does for real. Rewritten to delegate to
// AssetSelectDropDown directly — the same shared component
// NetworkSelectDropDown.tsx (this package) and the real app's own
// AccountSelectDropDown/PanelSubTitle.tsx already use — configured with
// the EXACT values PanelSubTitle.tsx's own header instance uses (ICON |
// SYMBOL | NAME | ADDRESS | COPY | CHEVRON | ADDR_COMP, addrPrePostSize
// 4, icon 22px/pill 16px/font 11px/chevron+copy 12px). That real address
// truncation, copy button, and click-to-expand/collapse now come free,
// and the pill is the same solid `bg-[#243056]` ADDR_COMP treatment
// NetworkSelectDropDown.tsx now uses too (see that file's own 2026-09-16
// update) — not the ad hoc translucent-white wrapper this file tried
// first, which matched the wrong reference (a stale pre-2026-09-15
// NetworkSelectDropDown look the real app itself has since moved past).
//
// Inline styles, not Tailwind classes (same reasoning as WalletHeader.tsx
// — a component library shouldn't require every consumer to run a
// Tailwind pipeline just to render correctly).

'use client';

import React, { useState } from 'react';
import AssetSelectDropDown, { ASSET_SELECT_DISPLAY } from './AssetSelectDropDown';

export interface WalletAccountHeaderRoles {
  isSponsor: boolean;
  isRecipient: boolean;
  isAgent: boolean;
}

export interface WalletAccountHeaderProps {
  /** Rendered in the icon slot when an account is selected. Omit for the
   *  unselected placeholder — no default avatar, since there's no default
   *  account to show one for. */
  icon?: React.ReactNode;
  address?: string;
  symbol?: string;
  name?: string;
  /** Shown (before ": ") when nothing is selected — the only real state
   *  this component has anything to render for today. */
  placeholderLabel?: string;
  /** Defaults to every role false/inert — matches "no account, no roles"
   *  rather than fabricating a role that isn't real. */
  roles?: WalletAccountHeaderRoles;
  /** Called on row click (e.g. open an account picker). Omit for an inert
   *  row with no picker to open yet. */
  onSelectClick?: () => void;
  // 2026-09-16, on request ("when the avatar.png is selected we should get
  // ACCOUNT_PANEL with the address sent as a parameter") — same
  // "icon click opens a details view, rest of the row opens the picker"
  // split NetworkSelectDropDown.tsx's own onIconClick already established
  // (see that file's 2026-09-08 doc comment) — AssetSelectDropDown already
  // supports this split (its own onIconClick prop, capture-phase, doesn't
  // fall through to onRowClick), this file just never exposed it. Called
  // with the CURRENT account's address (empty string if none) — the
  // caller's job to decide what "open ACCOUNT_PANEL" means for it (fetch
  // avatar.png/info.json, render AccountDetailPanel, etc.), same boundary
  // every other real-data callback in this package draws.
  onIconClick?: (address: string) => void;
  /** Called with which role badge was clicked, only for roles that are
   *  true (matches the app's own "only an active role opens Rewards"
   *  behavior). Omit — the default — and every badge is inert regardless
   *  of `roles`. */
  onRoleClick?: (role: 'sponsor' | 'recipient' | 'agent') => void;
  /** Flips the chevron to point up while whatever picker this opens is
   *  already showing — same chevronUp convention NetworkSelectDropDown's
   *  own trigger mode uses. Defaults false (closed). */
  chevronUp?: boolean;
}

const DEFAULT_ROLES: WalletAccountHeaderRoles = { isSponsor: false, isRecipient: false, isAgent: false };

const ROLE_ACTIVE_BG = '#16a34a'; // green-600, matches the app's real active-role color
const ROLE_INACTIVE_BG = '#dc2626'; // red-600, matches the app's real inactive-role color

function RoleCell({
  label,
  active,
  title,
  onClick,
  borderRight,
}: {
  label: string;
  active: boolean;
  title: string;
  onClick?: () => void;
  borderRight: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <td
      title={title}
      onClick={onClick}
      onMouseEnter={() => onClick && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRight: borderRight ? '1px solid #1f2937' : undefined,
        padding: '0 4px',
        textAlign: 'center',
        background: active ? (hovered ? '#22c55e' : ROLE_ACTIVE_BG) : ROLE_INACTIVE_BG,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <span style={{ display: 'inline-block' }}>{label}</span>
    </td>
  );
}

export default function WalletAccountHeader({
  icon,
  address,
  symbol,
  name,
  placeholderLabel = 'Select Active Wallet Account',
  roles = DEFAULT_ROLES,
  onSelectClick,
  onIconClick,
  onRoleClick,
  chevronUp = false,
}: WalletAccountHeaderProps) {
  const hasEntity = Boolean(address);

  return (
    <div
      style={{
        flexShrink: 0,
        borderBottom: '1px solid rgba(51,65,85,0.5)',
        paddingLeft: 10,
        paddingRight: 10,
        paddingTop: 2,
        paddingBottom: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        background: '#77808e',
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <AssetSelectDropDown
          rootId="WALLET_ACCOUNT_HEADER"
          hasEntity={hasEntity}
          icon={icon}
          symbol={symbol}
          name={name}
          address={address ?? ''}
          placeholderLabel={placeholderLabel}
          copyLabel="Copy Account Address"
          showDisplay={
            ASSET_SELECT_DISPLAY.ICON |
            ASSET_SELECT_DISPLAY.SYMBOL |
            ASSET_SELECT_DISPLAY.NAME |
            ASSET_SELECT_DISPLAY.ADDRESS |
            ASSET_SELECT_DISPLAY.COPY |
            (chevronUp ? ASSET_SELECT_DISPLAY.CHEVRON_UP : ASSET_SELECT_DISPLAY.CHEVRON_DN) |
            ASSET_SELECT_DISPLAY.ADDR_COMP
          }
          onRowClick={onSelectClick}
          onIconClick={onIconClick ? () => onIconClick(address ?? '') : undefined}
          addrPrePostSize={4}
          iconSizeClassName="h-[22px] w-[22px]"
          pillHeightClassName="h-[16px]"
          pillFontClassName="text-[11px]"
          chevronSize={12}
          copyIconSize={12}
          nameLineClassName="text-[11px] font-semibold leading-tight text-white"
        />
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
        <div
          style={{
            display: 'inline-block',
            border: '1.5px solid #1f2937',
          }}
        >
          <table style={{ borderCollapse: 'collapse', fontSize: 9, fontWeight: 700, color: '#ffffff' }}>
            <tbody>
              <tr>
                <RoleCell
                  label="S"
                  active={roles.isSponsor}
                  title={roles.isSponsor ? 'Sponsor Account — click to open Rewards' : 'Not a Sponsor Account'}
                  onClick={roles.isSponsor && onRoleClick ? () => onRoleClick('sponsor') : undefined}
                  borderRight
                />
                <RoleCell
                  label="R"
                  active={roles.isRecipient}
                  title={roles.isRecipient ? 'Recipient Account — click to open Rewards' : 'Not a Recipient Account'}
                  onClick={roles.isRecipient && onRoleClick ? () => onRoleClick('recipient') : undefined}
                  borderRight
                />
                <RoleCell
                  label="A"
                  active={roles.isAgent}
                  title={roles.isAgent ? 'Agent Account — click to open Rewards' : 'Not an Agent Account'}
                  onClick={roles.isAgent && onRoleClick ? () => onRoleClick('agent') : undefined}
                  borderRight={false}
                />
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
