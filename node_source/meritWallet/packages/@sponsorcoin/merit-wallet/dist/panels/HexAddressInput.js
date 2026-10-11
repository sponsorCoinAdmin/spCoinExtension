// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/HexAddressInput.tsx
//
// 2026-10-05 — moved here from the web app's components/shared/utils/ so the
// ADDRESS_PANEL's input bar is ONE component shared by the web app and the
// extension (the web app's old path now just re-exports this). Same look as
// before, with the height pinned to ADDRESS_ROW_HEIGHT_PX (36px, the same as a
// list row and the asset preview row) instead of being derived from padding +
// font size, so every address bar in the app is the same size.
//
// 2026-10-07, on request ("the ADDRESS_PANEL should be the same style or size as the rows in the list
// below it ... the style should exist in meritWalletStyle.ts") — the height, font, emoji, radius and
// padding now come from `listStyle.addressRow` (spcoin-common styles / meritWalletStyled.ts), which is
// the same height as a list row (26.5px), instead of a 36px literal that was taller than every row under
// it. ADDRESS_ROW_HEIGHT_PX below is kept as an alias so existing imports keep working.
//
// Inline styles, not Tailwind classes, so it renders the same in any host.
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { walletColors, listStyle } from '@sponsorcoin/spcoin-common/styles';
/** Height of every row in the address / list column (list rows, preview row, address bar). */
export const ADDRESS_ROW_HEIGHT_PX = listStyle.addressRow.heightPx;
export default function HexAddressInput({ inputValue, onChange, placeholder, statusEmoji, fullWidth = true, fitWidthCh, }) {
    const contentWidthCh = fitWidthCh ?? Math.max((inputValue || placeholder).length, 8);
    return (_jsxs("div", { style: {
            boxSizing: 'border-box',
            height: ADDRESS_ROW_HEIGHT_PX,
            background: walletColors.panel,
            color: walletColors.accent,
            width: fullWidth ? '100%' : 'auto',
            display: fullWidth ? 'flex' : 'inline-flex',
            alignItems: 'center',
            borderRadius: listStyle.addressRow.borderRadiusPx,
            paddingLeft: fullWidth ? listStyle.addressRow.paddingXPx : 8,
            paddingRight: fullWidth ? listStyle.addressRow.paddingXPx : 8,
            gap: fullWidth ? 8 : 4,
        }, children: [statusEmoji ? _jsx("div", { style: { fontSize: listStyle.addressRow.emojiSizePx }, children: statusEmoji }) : null, _jsx("input", { style: {
                    boxSizing: 'border-box',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: walletColors.white,
                    fontSize: listStyle.addressRow.fontSizePx,
                    fontFamily: 'inherit',
                    height: '100%',
                    padding: 0,
                    width: fullWidth ? '100%' : `${contentWidthCh}ch`,
                    textAlign: fullWidth ? 'left' : 'center',
                }, autoComplete: "off", placeholder: placeholder, value: inputValue, onChange: (e) => onChange(e.target.value) })] }));
}
