// File: test/tabDetailKeep.test.mjs
//
// docs/design/spcoinPackagesDesign.txt 8.5.10 and docs/meritMigration.txt row 5: a detail screen (account, token, network) stays with its tab like a list does; its record (the address or id) is data tied to its PANEL, so it is cleared
// when the detail's panel closes, not when the tab changes (a cleared record under a flag still on the stack drew a blank body on return).
// Run: node test/tabDetailKeep.test.mjs
// MUTANT=clearOnTab|noClearOnClose run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const m = process.env.MUTANT;
const swap = (text, from, to) => { assert.ok(text.includes(from), 'mutant anchor missing: ' + from); return text.replace(from, to); };
let wallet = fs.readFileSync(path.join(HERE, '..', 'src', 'MeritWallet.tsx'), 'utf8').replace(/\r\n/g, '\n');
if (m === 'clearOnTab') wallet = swap(wallet, "    setAddressInput('');\n  };\n  // The selected detail record", "    setAddressInput('');\n    setAccountDetailAddress(null);\n    setTokenDetailAddress(null);\n    setNetworkDetailId(null);\n  };\n  // The selected detail record");
if (m === 'noClearOnClose') wallet = swap(wallet, "useEffect(() => { if (!tokenDetailVisible) setTokenDetailAddress(null); }, [tokenDetailVisible]);\n", '');

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };
const tabClick = wallet.slice(wallet.indexOf('const handleTabClick = (tab: MenuTabKey) => {'), wallet.indexOf('// The selected detail record is data tied to its panel'));

await test('a tab click leaves the detail records alone', () => {
  assert.doesNotMatch(tabClick, /setAccountDetailAddress\(null\)|setTokenDetailAddress\(null\)|setNetworkDetailId\(null\)/);
});
await test('each detail record is cleared when its own panel closes', () => {
  // 2026-11-11: the account record is cleared when its panel is closed AND no message (the Remove confirmation) is up, a beat later, so backing out of the confirmation finds it still there
  assert.match(wallet, /if \(accountDetailVisible \|\| messageVisible\) return undefined;\n\s+const timer = setTimeout\(\(\) => \{\n\s+if \(accountDetailVisibleRef\.current\) return;\n\s+setAccountDetailGroup\(null\);\n\s+setAccountDetailTitle\(null\);/);
  // the token record clears only on a genuine was-open-now-closed transition (a wasVisible ref), never on "has not opened yet"
  assert.match(wallet, /const wasVisible = tokenDetailWasVisibleRef\.current;\n\s+tokenDetailWasVisibleRef\.current = tokenDetailVisible;\n\s+if \(!wasVisible \|\| tokenDetailVisible\) return;/);
  assert.match(wallet, /useEffect\(\(\) => \{ if \(!networkDetailVisible\) setNetworkDetailId\(null\); \}, \[networkDetailVisible\]\);/);
});

let failed = 0;
for (const [status, name] of results) { console.log(status + ' ' + name); if (status === 'FAIL') failed++; }
process.exit(failed ? 1 : 0);
