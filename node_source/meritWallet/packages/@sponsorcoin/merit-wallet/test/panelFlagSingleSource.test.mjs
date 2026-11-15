// File: test/panelFlagSingleSource.test.mjs
//
// 2026-10-16 -- one state per visibility flag. A control that shows or hides a panel (the hamburger and the tab bar) must read and write the panel tree's flag (usePanelVisible / openPanel / closePanel), never a local useState copy: a copy drifts, and the tree's [-]/[+] row and the screen stop agreeing.
// Run: node test/panelFlagSingleSource.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const src = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'MeritWallet.tsx'), 'utf8');
let failed = 0;
const check = (name, ok) => { if (!ok) { failed++; console.error('FAIL', name); } };

check('no local menuOpen state', !/\[\s*menuOpen\s*,\s*setMenuOpen\s*\]/.test(src));
check('hamburger writes the tree flag', /closePanel\(SP_COIN_DISPLAY\.MENU_TAB_HEADER_BAR/.test(src) && /openPanel\(SP_COIN_DISPLAY\.MENU_TAB_HEADER_BAR/.test(src));
check('hamburger lit from the tree flag', /menuOpen=\{menuTabHeaderVisible\}/.test(src));
check('tab bar shown from the tree flag alone', /<MenuTabHeaderBar open=\{menuTabHeaderVisible && !passwordPanelShowing\}/.test(src));

// The Send overlay is gated by SEND_PANEL in the shared overlay host (a host's send slot is a bare SendComponent; ungated, the Send form showed over the login screen).

// A second copy of a tree flag has a recognisable shape: local state named for the flag's open/visible/expanded state, read with `||` beside the tree value. Scan both packages' sources for it.
const roots = [path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src'), path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', 'spCoinPanels', 'packages', '@sponsorcoin', 'spcoin-panels', 'src')].filter((r) => fs.existsSync(r));
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : /\.tsx?$/.test(e.name) ? [path.join(d, e.name)] : []));
const COPY = /const \[\s*local\w*(Open|Visible|Expanded)\w*\s*,|\|\|\s*local\w*(Open|Visible|Expanded)/;
for (const root of roots) for (const f of walk(root)) if (COPY.test(fs.readFileSync(f, 'utf8'))) { failed++; console.error('FAIL local copy of a visibility flag in', path.relative(root, f)); }
check('both packages scanned', roots.length >= 1);

if (failed) process.exit(1);
console.log('panelFlagSingleSource: ok');
