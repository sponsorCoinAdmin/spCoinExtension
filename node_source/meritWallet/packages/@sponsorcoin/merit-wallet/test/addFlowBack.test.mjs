// File: test/addFlowBack.test.mjs
//
// docs/meritMigration.txt row 19: when the Add a Wallet/Account screens close, the active tab's panel must be shown again. Found by the deep parity walk (2026-10-20): in BOTH apps the back arrow left the tab title over a blank body, because the add flow is opened
// AFTER the account-list overlay is closed (nothing for the panel tree to restore) and selecting the tab you are on is a no-op by rule. A first version called openPanel in the same tick as the pop and made the first tap on Go back do nothing, so the restore is an
// EFFECT that runs after the pop has been applied. A source pin (the behaviour itself is walked by the parity walk's add-account case with DEEP_ONE_BACK=1).
// Run: node test/addFlowBack.test.mjs
// MUTANT=noEffect|sameTick|restoresWhenStillOpen run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
let src = fs.readFileSync(path.join(HERE, '..', 'src', 'MeritWallet.tsx'), 'utf8').split(String.fromCharCode(13)).join('');
const m = process.env.MUTANT;
if (m === 'noEffect') src = src.replace("if (wasOpen && addFlowTop == null && activeChild == null) openPanel(TAB_PANEL_IDS[activeTab], 'MeritWallet:addFlowRestoreTab');", '');
if (m === 'sameTick') src = src.replace("? () => closePanel(addFlowTop, 'NAV_POP:MeritWallet:addFlowBack')", "? () => { closePanel(addFlowTop, 'NAV_POP:MeritWallet:addFlowBack'); openPanel(TAB_PANEL_IDS[activeTab], 'x'); }");
if (m === 'restoresWhenStillOpen') src = src.replace("if (wasOpen && addFlowTop == null)", 'if (addFlowTop != null)');
const results = [];
const test = (name, fn) => { try { fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

test('an effect re-opens the active tab panel once the add flow has gone from open to closed', () => {
  assert.ok(src.includes('const prevAddFlowTopRef = useRef(addFlowTop);'));
  assert.ok(src.includes("if (wasOpen && addFlowTop == null && activeChild == null) openPanel(TAB_PANEL_IDS[activeTab], 'MeritWallet:addFlowRestoreTab');"));
  assert.ok(src.includes('}, [addFlowTop]);'));
});
test('the restore does not open a tab over a list that is still open (Back returns to that list)', () => {
  assert.ok(src.includes('&& activeChild == null) openPanel(TAB_PANEL_IDS[activeTab]'));
  // opening the add flow closes nothing: the list stays under it, and Back returns to it
  assert.equal(/onAddWalletAccount: addAccountHost ? () => {s*closeListOverlay()/.test(src), false);
});
test('the back arrow pops the flow only (the restore is not done in the same tick as the pop)', () => {
  assert.ok(src.includes("? () => closePanel(addFlowTop, 'NAV_POP:MeritWallet:addFlowBack')"));
  assert.equal(src.includes("'NAV_POP:MeritWallet:addFlowBack'); openPanel("), false);
});
test('the flow\'s own done path pops the flow and relies on the same effect', () => {
  assert.ok(src.includes("onDone: () => closePanel(addFlowTop, 'MeritWallet:addAccountFlow:done')"));
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
