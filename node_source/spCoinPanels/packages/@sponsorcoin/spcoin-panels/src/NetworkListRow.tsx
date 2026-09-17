// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/NetworkListRow.tsx
// Portable version of the real app's networks.tsx own renderOption() row
// (2026-09-15) — NETWORK_LIST's own distinct row shape, NOT built on
// AssetListRow.tsx (that row's right-side slot is a fixed info button;
// this row's right side is the Merit/MetaMask auth-source radio toggle
// instead — a genuinely different shape, not a reuse candidate). Reuses
// AssetSelectDropDown directly, same as AssetListRow.tsx does, with the
// exact same real-app-measured sizing (36px row, pl-[10px]/pr-5 buffer,
// 22px icon, 16px/11px pill, text-[11px] name line) — see networks.tsx's
// own 2026-09-15 dated comments for the measurement history behind each
// number. Placeholder in the same sense every file here is: `onSelect`/
// `onIconContextMenu`/`onAuthSourceChange` are plain optional callbacks,
// no real network-switch/RPC logic behind any of it.

'use client';

import React from 'react';
import AssetSelectDropDown, { ASSET_SELECT_DISPLAY } from './AssetSelectDropDown';

export type NetworkAuthSource = 'merit' | 'metamask';

export interface NetworkListRowProps {
  icon?: React.ReactNode;
  symbol?: string;
  name?: string;
  address?: string;
  /** Renders the same green "ACTIVE" tag networks.tsx's own activeBadge
   *  does, inline on the Symbol|Name line. */
  isActive?: boolean;
  onSelect?: () => void;
  // 2026-09-16, on request ("do the same for the info.png in the lists...
  // there are 3 list types... ACCOUNT, TOKEN and NETWORK") — this row has
  // no separate info button (its right-side slot is the auth-source
  // toggle, not an info icon — see this file's own top comment), so the
  // network's own logo fills that role instead, same "icon opens details,
  // rest of the row opens/selects" split every other row in this package
  // now has. AssetSelectDropDown already supports this (its own
  // onIconClick prop), this row just never exposed it until now.
  onIconClick?: () => void;
  onIconContextMenu?: (e: React.MouseEvent) => void;
  /** Current Merit/MetaMask radio selection for THIS row's own chainId —
   *  see networks.tsx's own NetworkAuthToggle doc comment for why this is
   *  kept per-row rather than one shared value. Omit to hide the toggle
   *  entirely (no default — there's no real per-chain auth source to
   *  default to without a real network list behind this). */
  authSource?: NetworkAuthSource;
  onAuthSourceChange?: (source: NetworkAuthSource) => void;
  /** Disambiguates each row's own native radio `name` attribute — see
   *  networks.tsx's own `groupId` doc comment (native radios group
   *  globally by name, not scoped to a React instance). */
  groupId?: string;
}

function AuthToggle({
  chainKey,
  groupId,
  authSource,
  onAuthSourceChange,
}: {
  chainKey: string;
  groupId: string;
  authSource: NetworkAuthSource;
  onAuthSourceChange?: (source: NetworkAuthSource) => void;
}) {
  return (
    // 2026-09-16 — scaled down to match the row's own new ~22.5px height
    // (was 14px radios / 10px text, sized for the old 36px row).
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 8, fontWeight: 600, flexShrink: 0 }}>
      {(['merit', 'metamask'] as NetworkAuthSource[]).map((source) => {
        const active = authSource === source;
        return (
          <label
            key={source}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 3, cursor: onAuthSourceChange ? 'pointer' : 'default', userSelect: 'none' }}
            title={`Authorize writes on this network with ${source === 'merit' ? 'Merit' : 'Metamask'}`}
          >
            {/* 2026-09-16 — real bug found live: native radio + accentColor
                (the previous approach) doesn't reliably paint a solid
                filled circle in the unchecked state across browsers, unlike
                the real app's own NetworkAuthToggle (components/wallet/lib/
                networks.tsx), which uses `appearance-none` + explicit
                border/background colors to always show a filled circle
                (red when unchecked, green when checked) regardless of
                native radio rendering. Replicated exactly here — inline
                style equivalents of that same Tailwind class, not
                accentColor. */}
            <input
              type="radio"
              name={`network-auth-source-${groupId}-${chainKey}`}
              checked={active}
              onChange={() => onAuthSourceChange?.(source)}
              style={{
                height: 10,
                width: 10,
                flexShrink: 0,
                margin: 0,
                WebkitAppearance: 'none',
                MozAppearance: 'none',
                appearance: 'none',
                borderRadius: 9999,
                border: `1px solid ${active ? '#22c55e' : '#dc2626'}`,
                background: active ? '#22c55e' : '#dc2626',
                cursor: onAuthSourceChange ? 'pointer' : 'default',
              }}
            />
            <span style={{ color: active ? '#4ade80' : '#8FA8FF' }}>{source === 'merit' ? 'Merit' : 'MM'}</span>
          </label>
        );
      })}
    </div>
  );
}

export default function NetworkListRow({
  icon,
  symbol,
  name,
  address,
  isActive,
  onSelect,
  onIconClick,
  onIconContextMenu,
  authSource,
  onAuthSourceChange,
  groupId = 'default',
}: NetworkListRowProps) {
  const activeBadge = isActive ? (
    <span
      style={{
        display: 'inline-flex',
        flexShrink: 0,
        alignItems: 'center',
        gap: 3,
        borderRadius: 4,
        background: '#16a34a',
        padding: '1px 5px',
        fontSize: 8,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: '#ffffff',
      }}
    >
      Active
    </span>
  ) : undefined;

  return (
    // 2026-09-16, on request ("apply the text/row/style/size from [the
    // Rewards Management table] to Select Network") — row height/padding
    // now match RewardRow.tsx's own real measured values (~22.5px row,
    // 5px horizontal padding) instead of this row's own prior, separately-
    // tuned 36px/10px-20px scale. Icon/pill/font sizes below are scaled
    // proportionally to fit this shorter row — RewardRow itself has no
    // icon/pill element to copy an exact number from (it's a plain label/
    // amount/button row), so these are a reasoned scale-down (same ratio
    // the icon/pill already had to the old 36px row), not another
    // hand-measured real value. active rows get the same bg-green-600/20
    // tint as the real app instead of the plain zebra background (caller
    // decides zebra index; this component only knows isActive).
    <div
      style={{
        width: '100%',
        // 2026-09-16, corrected — the row genuinely needs to be 4px taller
        // (2px top + 2px bottom), not just gain inner padding: a fixed
        // maxHeight equal to the old height meant padding just ate into
        // existing content space rather than growing the box, so the row
        // looked visually unchanged. 22.5 + 4 = 26.5.
        minHeight: 26.5,
        maxHeight: 26.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 2,
        paddingBottom: 2,
        paddingLeft: 5,
        paddingRight: 10,
        boxSizing: 'border-box',
        background: isActive ? 'rgba(22,163,74,0.2)' : undefined,
      }}
    >
      <AssetSelectDropDown
        icon={icon}
        symbol={symbol}
        name={name}
        address={address ?? ''}
        hasEntity={!!address}
        showDisplay={
          ASSET_SELECT_DISPLAY.ICON |
          ASSET_SELECT_DISPLAY.ADDRESS |
          ASSET_SELECT_DISPLAY.SYMBOL |
          ASSET_SELECT_DISPLAY.NAME |
          ASSET_SELECT_DISPLAY.COPY |
          ASSET_SELECT_DISPLAY.ADDR_COMP
        }
        // Omitted (was 4) — 2026-09-16: this address slot carries a literal
        // "NetworkId : $id" label (see MeritWallet.tsx's own networkRows
        // mapping), not a real hex address to truncate. Matches the real
        // app's own row-mode NetworkSelectDropDown.tsx, which leaves this
        // unset for the exact same reason (undefined shows the full
        // string, per AssetSelectDropDown's own displayedAddress logic).
        onRowClick={onSelect}
        onIconClick={onIconClick ? () => onIconClick() : undefined}
        onIconContextMenu={onIconContextMenu}
        iconSizeClassName="h-[17.5px] w-[17.5px]"
        pillHeightClassName="h-[10px]"
        pillFontClassName="text-[9px]"
        chevronSize={9}
        copyIconSize={9}
        nameLineClassName="text-[10px] font-semibold leading-tight text-white"
        nameLineSuffix={activeBadge}
      />
      {authSource && (
        <AuthToggle chainKey={address || symbol || name || 'row'} groupId={groupId} authSource={authSource} onAuthSourceChange={onAuthSourceChange} />
      )}
    </div>
  );
}
