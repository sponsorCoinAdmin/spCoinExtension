// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/RewardRow.tsx
// One label/amount/button row — the shared primitive both
// ManageSponsorshipsPanel.tsx (Trading/Staked/Pending, top level) and
// RewardsPendingByAccountTypePanel.tsx (Sponsor/Recipient/Agent, indented)
// render, matching the real app's own SpCoins/Amount/Options table
// columns. Entirely inert: `onClick` is a plain optional callback, no
// hover/loading/disabled states — see docs/design/extensionPlan.md's
// "Fourth slice" entry for why this stays shape-only rather than
// replicating the real component's much richer per-row state machine.
'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REWARD_ROW_LABEL_WIDTH = exports.REWARD_ROW_BG_B = exports.REWARD_ROW_BG_A = void 0;
exports.default = RewardRow;
const jsx_runtime_1 = require("react/jsx-runtime");
// 2026-09-15, on request ("alternating row bg colors ... green buttons") —
// matches the real app's own msTableTw.ts rowA/rowB exactly (components/
// views/RadioOverlayPanels/msTableTw.ts), so the extension's zebra striping
// is genuinely the same colors as the web app's, not a close guess.
exports.REWARD_ROW_BG_A = 'rgba(56,78,126,0.35)';
exports.REWARD_ROW_BG_B = 'rgba(156,163,175,0.25)';
// 2026-09-15, on request ("moved further to the left, maybe 30px from the
// longest text which is Recipient") — the label column was `flex: '0 0
// 42%'`, a percentage far wider than any actual label ever needs, leaving
// a big dead gap before Amount. Switched to a fixed px width instead — and
// rather than guess a new number, reused the real app's OWN already-tuned
// value for this exact column (COL_0_WIDTH, components/views/
// RadioOverlayPanels/ManageSponsorshipsPanel.tsx), which the web table
// proves comfortably fits its own longest indented label ("   •   Recipient")
// at the same 10px font this table now also uses (see the 2026-09-15 font
// parity pass) with room to spare.
exports.REWARD_ROW_LABEL_WIDTH = 105;
function RewardRow({ label, amountText, buttonLabel, onClick, indent, unavailable, rowBg }) {
    return (
    // 2026-09-14, on request ("the text is too large in the rewards
    // panel and should be scaled like we did in the Sponsor panel") —
    // shrunk another notch from the first pass (label/amount 11->10,
    // button 10->9, tighter row padding), same kind of further reduction
    // RecipientSelectPanel's avatar/text/cog got in the Sponsor tab.
    // 2026-09-15, on request ("THE BUTTONS IN THE EXTENSION should be the
    // same width and size as the web wallet with the same buffer spacing")
    // — padding was '5px 10px' (an unmeasured guess); the real app's own
    // <tr> (components/views/RadioOverlayPanels/ManageSponsorshipsPanel.tsx,
    // via msTableTw.td5's py-[3.5px]) measures a real, live 22.5px total row
    // height with a 19.5px-tall button inside it — 1.5px top/bottom is what
    // actually produces that, not 5px. Horizontal 5px matches msTableTw's
    // own td5 (px-[5px]), the column class this row's real counterpart
    // (Trading/Staked/Pending's label cell) actually uses.
    (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'center', padding: '1.5px 5px', borderTop: '1px solid #1e293b', gap: 6, background: rowBg }, children: [(0, jsx_runtime_1.jsxs)("div", { style: {
                    flex: `0 0 ${exports.REWARD_ROW_LABEL_WIDTH}px`,
                    // boxSizing: 'border-box' is required here — without it, an
                    // indented row's paddingLeft ADDS to this box's content width on
                    // top of the 42% flex-basis (default content-box sizing), making
                    // indented label boxes wider than non-indented ones and pushing
                    // the Amount column start a few px right for every nested
                    // (Sponsor/Recipient/Agent) row relative to Trading/Staked/
                    // Pending — the real cause of the Amount column misaligning
                    // between top-level and nested rows. border-box keeps this box's
                    // total width fixed at 42% regardless of padding, so Amount
                    // starts at the same x for every row.
                    boxSizing: 'border-box',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    paddingLeft: indent ? 12 : 0,
                    fontSize: 10,
                    fontWeight: 600,
                    color: unavailable ? '#ef4444' : '#ffffff',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                }, children: [indent && (0, jsx_runtime_1.jsx)("span", { style: { fontSize: 8 }, children: "\u2022" }), label] }), (0, jsx_runtime_1.jsx)("div", { style: {
                    flex: 1,
                    textAlign: 'left',
                    fontSize: 10,
                    color: unavailable ? '#ef4444' : '#e2e8f0',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                }, children: amountText }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onClick, style: {
                    flexShrink: 0,
                    // 2026-09-15, on request ("should be the same width and size as
                    // the web wallet") — no minWidth here before meant "Stake"/
                    // "Unstake"/"Claim" each sized to their own text, visibly
                    // different widths row to row. The real app's own buttons
                    // (msTableTw.btnGreen's min-w-[76px]) are all locked to the
                    // same 76px regardless of label length — measured live off the
                    // actual rendered buttons, not read off the class name alone.
                    minWidth: 76,
                    borderRadius: 6,
                    border: 'none',
                    // Matches msTableTw.btnGreen exactly (components/views/
                    // RadioOverlayPanels/msTableTw.ts) — the real app's Stake/
                    // Unstake/Claim buttons are green, this placeholder's own
                    // dull blue/gray never matched.
                    background: '#147f3b',
                    color: '#ffffff',
                    fontSize: 9,
                    fontWeight: 600,
                    // 2026-09-15: 7px -> 6px horizontal, matching the real buttons'
                    // own measured 6px/3px padding exactly (was an unmeasured guess).
                    padding: '3px 6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: onClick ? 'pointer' : 'default',
                }, children: buttonLabel })] }));
}
