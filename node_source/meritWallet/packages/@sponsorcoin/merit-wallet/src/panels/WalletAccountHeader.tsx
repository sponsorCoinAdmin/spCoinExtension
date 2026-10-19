// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/WalletAccountHeader.tsx
// Portable shell for WALLET_ACCOUNT_HEADER (2026-09-12, reworked
// 2026-09-22). The real app version (components/views/Headers/
// PanelSubTitle.tsx) renders AccountSelectDropDown (a real account +
// avatar + panel-tree-driven picker, with its own collapseKey/hydration
// behavior) and RoleTableComponent (a LIVE server fetch against on-chain
// account-role data via /api/spCoin/run-script). Neither has anything
// real to show in a consumer with no account/chain connection at all
// (the extension, today).
//
// 2026-09-22, on direct request ("we are sharing WALLET_NETWORK_HEADER
// through NPM... let's do the exact same change for WALLET_ACCOUNT_HEADER
// so we can be sure they are the same") — this used to be a rigid,
// props-driven placeholder (icon/address/symbol/name/roles booleans in,
// AssetSelectDropDown + a hand-rolled role table out), which is exactly
// why its own padding silently drifted from PanelSubTitle.tsx's real
// 16px (this file had 10px until caught live, see WalletHeader.tsx's own
// matching comment on the exact same bug). Reworked to the SAME "opaque
// slot" pattern WalletHeader.tsx's own leftSlot already uses: this file
// now owns only the outer flex/padding/background shell — real content
// (the account pill, the role badges) is injected by the caller as plain
// ReactNode children, so there's nothing left for either app to
// duplicate or drift out of sync on except this one file. The old
// props-driven rendering (icon/address/symbol/name/roles/onIconClick/
// onRoleClick/chevronUp) still works exactly as before as the DEFAULT
// when pillSlot/roleSlot are omitted — MeritWallet.tsx (this package,
// the extension's real consumer) keeps using it unchanged; only
// PanelSubTitle.tsx (the web app) was moved onto the new slots, passing
// its own real AccountSelectDropDown/RoleTableComponent straight through.
//
// Inline styles, not Tailwind classes (same reasoning as WalletHeader.tsx
// — a component library shouldn't require every consumer to run a
// Tailwind pipeline just to render correctly).

'use client';

import { accountHeaderStyle, walletPartClass } from '@sponsorcoin/spcoin-common/styles';
import React, { useState } from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { AssetSelectDropDown, ASSET_SELECT_DISPLAY, PanelGate } from '@sponsorcoin/spcoin-panels';

import { ANONYMOUS_ACCOUNT_AVATAR_URL } from '@sponsorcoin/spcoin-feeds/accounts';

export interface WalletAccountHeaderRoles {
  isSponsor: boolean;
  isRecipient: boolean;
  isAgent: boolean;
}

export interface WalletAccountHeaderProps {
  /** The account picker pill itself — an opaque slot, exactly like
   *  WalletHeader.tsx's own leftSlot. Pass the caller's own real
   *  component here (e.g. the web app's AccountSelectDropDown) to get
   *  its real behavior for free; omit to fall back to this package's own
   *  AssetSelectDropDown-based placeholder, built from the icon/address/
   *  symbol/name/... props below (unchanged from before this file had
   *  slots at all). */
  pillSlot?: React.ReactNode;
  /** The role badges (S/R/A) — opaque slot, same pattern as pillSlot.
   *  Pass `null` explicitly to render no role area at all; omit to fall
   *  back to this package's own static role table, built from `roles`/
   *  `onRoleClick` below. */
  roleSlot?: React.ReactNode | null;

  // --- Fallback-placeholder props, used only when pillSlot is omitted ---
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
  /** Flips the chevron to point up while whatever picker this opens is
   *  already showing — same chevronUp convention NetworkSelectDropDown's
   *  own trigger mode uses. Defaults false (closed). */
  chevronUp?: boolean;
  /** The wallet that signs for the account (docs/design/accountAuthDesign.txt section 18 4.3), e.g. "Merit Wallet (Extension)": the header's tooltip, so the person can always see which wallet is about to approve. */
  walletName?: string;

  // --- Fallback-role-table props, used only when roleSlot is omitted ---
  /** Defaults to every role false/inert — matches "no account, no roles"
   *  rather than fabricating a role that isn't real. */
  roles?: WalletAccountHeaderRoles;
  /** Called with which role badge was clicked, only for roles that are
   *  true (matches the app's own "only an active role opens Rewards"
   *  behavior). Omit — the default — and every badge is inert regardless
   *  of `roles`. */
  onRoleClick?: (role: 'sponsor' | 'recipient' | 'agent') => void;
}

const DEFAULT_ROLES: WalletAccountHeaderRoles = { isSponsor: false, isRecipient: false, isAgent: false };


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
      style={accountHeaderStyle.roleCell({ borderRight, active, hovered, clickable: !!onClick })}
    >
      <span style={accountHeaderStyle.roleLabel}>{label}</span>
    </td>
  );
}

/** This package's own inert default pill — used only when the caller
 *  doesn't pass pillSlot (e.g. the extension, via MeritWallet.tsx, which
 *  still calls this with the old icon/address/symbol/... props). */
function DefaultAccountPill({
  icon,
  address,
  symbol,
  name,
  placeholderLabel,
  onSelectClick,
  onIconClick,
  chevronUp,
}: Pick<WalletAccountHeaderProps, 'icon' | 'address' | 'symbol' | 'name' | 'placeholderLabel' | 'onSelectClick' | 'onIconClick' | 'chevronUp'>) {
  const hasEntity = Boolean(address);
  return (
    <AssetSelectDropDown
      rootId="WALLET_ACCOUNT_HEADER"
      hasEntity={hasEntity}
      // 2026-10-03 — shared Anonymous avatar when no account avatar is available.
      icon={icon}
      defaultIconSrc={ANONYMOUS_ACCOUNT_AVATAR_URL}
      showIconWhenEmpty
      symbol={symbol}
      name={name}
      address={address ?? ''}
      placeholderLabel={placeholderLabel ?? 'Select Account'}
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
      iconSizeClassName={walletPartClass.compactPill.iconSize}
      pillHeightClassName={walletPartClass.compactPill.pillHeight}
      pillFontClassName={walletPartClass.compactPill.pillFont}
      chevronSize={walletPartClass.compactPill.chevronSize}
      copyIconSize={walletPartClass.compactPill.copyIconSize}
      nameLineClassName={walletPartClass.compactPill.nameLine}
    />
  );
}

/** This package's own inert default role table — same "used only when the
 *  caller doesn't pass roleSlot" reasoning as DefaultAccountPill above. */
function DefaultRoleTable({
  roles = DEFAULT_ROLES,
  onRoleClick,
}: Pick<WalletAccountHeaderProps, 'roles' | 'onRoleClick'>) {
  return (
    <div style={accountHeaderStyle.roleBox}>
      <table style={accountHeaderStyle.roleTable}>
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
  );
}

export default function WalletAccountHeader({
  pillSlot,
  roleSlot,
  icon,
  address,
  symbol,
  name,
  placeholderLabel,
  roles,
  onSelectClick,
  onIconClick,
  onRoleClick,
  chevronUp,
  walletName,
}: WalletAccountHeaderProps) {
  const resolvedPill =
    pillSlot ?? (
      <DefaultAccountPill
        icon={icon}
        address={address}
        symbol={symbol}
        name={name}
        placeholderLabel={placeholderLabel}
        onSelectClick={onSelectClick}
        onIconClick={onIconClick}
        chevronUp={chevronUp}
      />
    );
  // roleSlot === null is an explicit "render nothing" — distinct from
  // undefined ("caller didn't pass one, use the default").
  const resolvedRole =
    roleSlot === null ? null : roleSlot ?? <DefaultRoleTable roles={roles} onRoleClick={onRoleClick} />;

  return (
    <div
      title={walletName ? `Signs with ${walletName}` : undefined}
      style={accountHeaderStyle.row}
    >
      <div style={accountHeaderStyle.pill}>
        <PanelGate panel={SP_COIN_DISPLAY.ACCOUNT_SELECT_DROP_DOWN} lazyLoad={false}>
          {resolvedPill}
        </PanelGate>
      </div>
      {resolvedRole && (
        <div style={accountHeaderStyle.role}>
          <PanelGate panel={SP_COIN_DISPLAY.ROLE_TABLE_COMPONENT} lazyLoad={false}>
            {resolvedRole}
          </PanelGate>
        </div>
      )}
    </div>
  );
}
