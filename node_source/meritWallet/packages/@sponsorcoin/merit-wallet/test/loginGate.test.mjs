// File: test/loginGate.test.mjs
//
// Tests for the wiring of the login gate (docs/passwordSecurityToDo.txt P2 to P7; docs/design/passwordSecurity.txt section 7): the engine's panel gate (which panels are held while the login is
// needed or unknown, and the boot panel state with nothing but the password page), and pins on the source of the pieces that cannot run without a browser (the one approval screen with the
// password field, the module-level gate registration, the per-platform stored password). The live check of the whole thing is scripts/live/passwordGate.cjs. Run: node test/loginGate.test.mjs
// Parts that read the exchange engine's source are skipped when that checkout is not present (web-only CI).
// MUTANT=heldIgnoresDescendants|passwordHeld|passableStillHeld|noGateStillHeld|bootKeepsOverlayOpen|bootNoPassword|bootNoRemember|bareModalBack|approvalNeedsNoPassword|wrongPasswordApproves|noModuleRegistration|unscopedStorage|bootGateOnlyAfterRender run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(HERE, '..', '..', '..', '..', '..', '..');
const req = createRequire(import.meta.url);
const ts = req('typescript');
const m = process.env.MUTANT;
const read = (...p) => { const f = path.join(WEB, ...p); return fs.existsSync(f) ? fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n') : null; };
const mutate = (src, from, to) => { assert.ok(src.includes(from), 'mutant anchor missing: ' + from); return src.replace(from, to); };

let passed = 0, failed = 0, skipped = 0;
const t = (name, fn) => { try { fn(); passed++; } catch (e) { failed++; console.log('FAIL ' + name + ': ' + String(e.message).split('\n')[0]); } };
const skip = (why) => { skipped++; console.log('SKIP ' + why); };

// ---------------------------------------------------------------- the engine's panel gate (behaviour)
const ENGINE = ['node_source', 'spCoinExchangeEngine', 'packages', '@sponsorcoin', 'spcoin-exchange-engine', 'src', 'panelTree'];
let gateSrc = read(...ENGINE, 'panelGate.ts');
if (gateSrc == null) {
  skip('panelGate.ts (the exchange engine checkout is not present)');
} else {
  if (m === 'heldIgnoresDescendants') gateSrc = mutate(gateSrc, 'let cur: SP_COIN_DISPLAY | undefined = panel;', 'let cur: SP_COIN_DISPLAY | undefined = undefined; if (OVERLAYS.has(Number(panel))) return panel;');
  if (m === 'passwordHeld') gateSrc = mutate(gateSrc, 'return ancestor != null && Number(ancestor) !== Number(SP_COIN_DISPLAY.PASSWORD_PANEL);', 'return ancestor != null;');
  if (m === 'passableStillHeld') gateSrc = mutate(gateSrc, 'if (!passable || passable()) return false; // no gate registered, or the gate is passable', 'if (!passable) return false;');
  if (m === 'noGateStillHeld') gateSrc = mutate(gateSrc, 'if (!passable || passable()) return false; // no gate registered, or the gate is passable', 'if (passable && passable()) return false;');
  if (m === 'bootKeepsOverlayOpen') gateSrc = mutate(gateSrc, "{ ...e, visible: Number(e.panel) === pw }", 'e');
  if (m === 'bootNoPassword') gateSrc = mutate(gateSrc, "if (!next.some((e) => Number(e.panel) === pw)) next.push(", 'if (false) next.push(');
  if (m === 'bootNoRemember') gateSrc = mutate(gateSrc, 'if (open) panelBeforeGate = open.panel as SP_COIN_DISPLAY;', '');
  const out = ts.transpileModule(gateSrc, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  // a small fake panel tree: overlays 1, 2, 9 (9 = PASSWORD_PANEL); 11 sits under 10 under 2; 3 under 1; 50 belongs to no overlay
  let gate;
  const fakes = {
    '@sponsorcoin/spcoin-common/panels': { MAIN_RADIO_OVERLAY_PANELS: [1, 2, 9], PARENT_OF: { 10: 2, 11: 10, 3: 1 }, SP_COIN_DISPLAY: { PASSWORD_PANEL: 9 }, panelName: (n) => 'P' + n },
    './panelTreeCallbacks': { getPanelTreeGateCheck: () => gate },
  };
  const mod = { exports: {} };
  new Function('module', 'exports', 'require', out)(mod, mod.exports, (id) => fakes[id]);
  const { isPanelHeldByGate, overlayAncestorOf, applyGateToBootPanels, takePanelBeforeGate, setPanelBeforeGate } = mod.exports;

  t('no gate registered (the extension): nothing is ever held', () => { gate = undefined; for (const p of [1, 2, 3, 9, 11, 50]) assert.equal(isPanelHeldByGate(p), false); });
  t('a passable gate holds nothing', () => { gate = () => true; for (const p of [1, 2, 3, 9, 11, 50]) assert.equal(isPanelHeldByGate(p), false); });
  t('a closed gate holds every overlay except the password page', () => { gate = () => false; assert.equal(isPanelHeldByGate(1), true); assert.equal(isPanelHeldByGate(2), true); assert.equal(isPanelHeldByGate(9), false); });
  t('a closed gate holds panels UNDER an overlay too (the old bypass wrote those)', () => { gate = () => false; assert.equal(isPanelHeldByGate(3), true); assert.equal(isPanelHeldByGate(11), true); });
  t('a closed gate does not hold what belongs to no overlay (the wallet frame, its headers)', () => { gate = () => false; assert.equal(isPanelHeldByGate(50), false); });
  t('overlayAncestorOf walks up the tree', () => { assert.equal(overlayAncestorOf(11), 2); assert.equal(overlayAncestorOf(1), 1); assert.equal(overlayAncestorOf(50), undefined); });

  const flat = () => [{ panel: 1, name: 'P1', visible: true }, { panel: 2, name: 'P2', visible: false }, { panel: 50, name: 'P50', visible: true }];
  t('boot while the gate is closed: every overlay is closed and the password page is open', () => {
    gate = () => false; takePanelBeforeGate();
    const next = applyGateToBootPanels(flat());
    assert.equal(next.find((e) => e.panel === 1).visible, false);
    assert.equal(next.find((e) => e.panel === 2).visible, false);
    assert.equal(next.find((e) => e.panel === 9).visible, true);
    assert.equal(next.find((e) => e.panel === 50).visible, true, 'a panel outside the overlays is untouched');
  });
  t('boot remembers the overlay the person had open, for the login to return to', () => {
    gate = () => false; takePanelBeforeGate();
    applyGateToBootPanels(flat());
    assert.equal(takePanelBeforeGate(), 1);
    assert.equal(takePanelBeforeGate(), undefined, 'taking it clears it');
  });
  t('boot with a passable gate changes nothing', () => { gate = () => true; const f = flat(); assert.deepEqual(applyGateToBootPanels(f), f); });
  t('boot with no gate registered changes nothing', () => { gate = undefined; const f = flat(); assert.deepEqual(applyGateToBootPanels(f), f); });
  t('setPanelBeforeGate / takePanelBeforeGate round trip', () => { setPanelBeforeGate(2); assert.equal(takePanelBeforeGate(), 2); });
}

// ---------------------------------------------------------------- pins on source that needs a browser
const ENGINE_SRC = ['node_source', 'spCoinExchangeEngine', 'packages', '@sponsorcoin', 'spcoin-exchange-engine', 'src'];
let setVis = read(...ENGINE_SRC, 'panelTree', 'useSetPanelVisible.ts');
let bootExt = read(...ENGINE_SRC, 'structure', 'bootExtensions.ts');
let providers = read('components', 'Wrappers', 'SpCoinProviders.tsx');
let flowPanel = read('node_source', 'meritWallet', 'packages', '@sponsorcoin', 'merit-wallet', 'src', 'approval', 'ApprovalResponder.tsx');
let confirm = read('node_source', 'spCoinPanels', 'packages', '@sponsorcoin', 'spcoin-panels', 'src', 'TransactionConfirmPanel.tsx');
let persisted = read('components', 'wallet', 'lib', 'meritConnect', 'persistedPasswordStorage.ts');
let session = read('components', 'wallet', 'lib', 'meritConnect', 'walletPasswordSession.ts');
if (m === 'bareModalBack' && flowPanel) flowPanel = flowPanel + "\nimport { PasswordConfirmModal } from '@/components/modals';\n";
if (m === 'approvalNeedsNoPassword' && confirm) confirm = mutate(confirm, 'const canApprove = !busy && (!requirePassword || password.length > 0);', 'const canApprove = !busy;');
if (m === 'wrongPasswordApproves' && flowPanel) flowPanel = mutate(flowPanel, "      if (!unlocked) {\n        setPasswordError('Incorrect password.');\n        return;\n      }", '');
if (m === 'noModuleRegistration' && providers) providers = mutate(providers, "if (typeof window !== 'undefined') setPanelTreeGateCheck(() => !isWalletGateOpen());", '');
if (m === 'unscopedStorage' && persisted) persisted = mutate(persisted, 'const LS_KEY = `${LEGACY_LS_KEY}:${PERSISTED_PASSWORD_SCOPE}`;', 'const LS_KEY = LEGACY_LS_KEY;');
if (m === 'bootGateOnlyAfterRender' && bootExt) bootExt = mutate(bootExt, 'applyGateToBootPanels(reconcileOverlayVisibility(ensured) as any) as any', 'reconcileOverlayVisibility(ensured)');

if (setVis == null || bootExt == null) {
  skip('engine source pins (the exchange engine checkout is not present)');
} else {
  t('setPanelVisible refuses to show a panel the gate holds (and always allows closing)', () => assert.match(setVis, /if \(visible && isPanelHeldByGate\(panel\)\) return;/));
  t('the boot panel state is gated before anything renders', () => assert.ok(bootExt.includes('applyGateToBootPanels(reconcileOverlayVisibility(ensured) as any) as any')));
}
if (providers == null) skip('SpCoinProviders pin'); else t('the login gate is registered at MODULE load, before the provider boots (not only from an effect)', () => assert.match(providers, /if \(typeof window !== 'undefined'\) setPanelTreeGateCheck\(\(\) => !isWalletGateOpen\(\)\);/));
if (flowPanel == null || confirm == null) skip('approval screen pins'); else {
  t('a write that needs the password uses the ONE approval screen with a password field, not a bare password prompt', () => {
    assert.ok(!/import \{ PasswordConfirmModal \}/.test(flowPanel) && !/<PasswordConfirmModal/.test(flowPanel), 'the bare password modal is gone from the write flow');
    assert.ok(flowPanel.includes('requirePassword={Boolean(request.isLocked && !passwordConfirmed)}'));
    assert.ok(flowPanel.includes('onApprove={(password) => void approve(password)}'));
  });
  t('a wrong password leaves the screen open and never approves; the right one unlocks and approves in one step', () => {
    const h = flowPanel.slice(flowPanel.indexOf('const approve = async'), flowPanel.indexOf('const phase = request?.phase;'));
    assert.match(h, /const unlocked = host\?\.unlock \? await host\.unlock\(password \?\? ''\) : false;\n\s+if \(!unlocked\) \{\n\s+setPasswordError\('Incorrect password\.'\);\n\s+return;\n\s+\}/);
    assert.match(h, /setIsSigning\(true\);\n\s+resolveMeritApproval\(true\);/);
  });
  t('Approve stays disabled until a password is typed when one is required', () => assert.ok(confirm.includes('const canApprove = !busy && (!requirePassword || password.length > 0);') && confirm.includes('disabled={!canApprove}')));
}
if (persisted == null) skip('persisted password pins'); else {
  t('the stored password is scoped per platform and wallet (storage key and encryption-key record)', () => {
    assert.ok(persisted.includes("export const PERSISTED_PASSWORD_SCOPE = 'web:serverKeystore';"));
    assert.ok(persisted.includes('const LS_KEY = `${LEGACY_LS_KEY}:${PERSISTED_PASSWORD_SCOPE}`;'));
    // (row 21: the key's record id is passed to the shared createIndexedDbKeyProvider, still scoped the same way)
    assert.ok(persisted.includes('recordId: `aes-key:${PERSISTED_PASSWORD_SCOPE}`'));
  });
  t('the older unscoped stored password is dropped on first use', () => assert.ok(persisted.includes('dropLegacyUnscopedEntry();')));
}
if (session == null) skip('session pins'); else {
  t('the first gate question already uses the saved mode (App when nothing is saved)', () => { assert.ok(session.includes("let gatePasswordMode = initialGateMode();")); assert.ok(session.includes("return typeof mode === 'string' ? mode : 'appRequired';")); });
  t('the login state starts UNKNOWN (silent and closed until the provider publishes the real one)', () => assert.ok(session.includes("let loginState: LoginState = 'UNKNOWN';")));
}

console.log((failed === 0 ? 'ALL ' : 'SOME ') + passed + '/' + (passed + failed) + ' passed' + (skipped ? ', ' + skipped + ' skipped' : '') + (m ? ' (MUTANT=' + m + ')' : ''));
process.exit(failed === 0 ? 0 : 1);
