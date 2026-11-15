// File: test/validateLogin.test.mjs
//
// Tests for ValidateLogin and the login state (src/session/validateLogin.ts; docs/design/passwordSecurity.txt section 7, docs/passwordSecurityToDo.txt P3). Run: node test/validateLogin.test.mjs
// The table below IS the decision tree of passwordSecurityToDo.txt section 2, row by row, plus invariants over the whole input space.
// MUTANT=initialBrowseNeedsLogin|unknownShowsLogin|allApproves|mandatoryIgnored|persistedLikeAll|disabledAsksLogin|loggedOutWriteNone|deriveIgnoresBoot|approvalIgnored|appBrowseOpen|mandatoryNoPassword run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const ts = req('typescript');
let src = fs.readFileSync(path.join(HERE, '..', 'src', 'session', 'validateLogin.ts'), 'utf8').replace(/\r\n/g, '\n');
const mutate = (from, to) => { assert.ok(src.includes(from), 'mutant anchor missing: ' + from); src = src.replace(from, to); };
const m = process.env.MUTANT;
if (m === 'initialBrowseNeedsLogin') mutate("const browseNeedsLogin = mode !== 'firstApproved';", 'const browseNeedsLogin = true;');
if (m === 'unknownShowsLogin') mutate("if (loginState === 'UNKNOWN') return 'WAIT';", "if (loginState === 'UNKNOWN') return 'LOGIN';");
if (m === 'allApproves') mutate("if (mode === 'methodRequired') return 'PASSWORD';", "if (mode === 'methodRequired') return 'APPROVE';");
if (m === 'mandatoryIgnored') mutate("  if (input.mandatoryPassword) return 'PASSWORD';\n  if (kind === 'BROWSE') return 'NONE';", "  if (kind === 'BROWSE') return 'NONE';");
if (m === 'persistedLikeAll') mutate("if (mode === 'methodRequired') return 'PASSWORD';", "if (mode === 'methodRequired' || mode === 'persisted') return 'PASSWORD';");
if (m === 'disabledAsksLogin') mutate("if (mode === 'disabled' && !input.mandatoryPassword) return 'NONE';", '');
if (m === 'loggedOutWriteNone') mutate("if (loginState === 'LOGGED_OUT') return 'LOGIN';", "if (loginState === 'LOGGED_OUT') return kind === 'WRITE' ? 'NONE' : 'LOGIN';");
if (m === 'deriveIgnoresBoot') mutate("if (!facts.bootResolved) return 'UNKNOWN';", '');
if (m === 'approvalIgnored') mutate("return input.mandatoryApproval ? 'APPROVE' : 'NONE';", "return 'NONE';");
if (m === 'appBrowseOpen') mutate("const browseNeedsLogin = mode !== 'firstApproved';", "const browseNeedsLogin = mode === 'methodRequired';");
if (m === 'mandatoryNoPassword') mutate("  if (input.mandatoryPassword) return 'PASSWORD';\n  if (kind === 'BROWSE') return 'NONE';", "  if (input.mandatoryPassword) return 'APPROVE';\n  if (kind === 'BROWSE') return 'NONE';");

const out = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const mod = { exports: {} };
new Function('module', 'exports', out)(mod, mod.exports);
const { validateLogin, isLoginGateClosed, deriveLoginState } = mod.exports;

let passed = 0, failed = 0;
const t = (name, fn) => { try { fn(); passed++; } catch (e) { failed++; console.log('FAIL ' + name + ': ' + String(e.message).split('\n')[0]); } };
const v = (mode, loginState, kind, extra = {}) => validateLogin({ mode, loginState, kind, ...extra });
const STATES = ['UNKNOWN', 'LOGGED_OUT', 'LOGGED_IN'];
const KINDS = ['BROWSE', 'WRITE'];

// the decision tree, row by row
t('Disabled: nothing, ever', () => { for (const st of STATES) for (const k of KINDS) assert.equal(v('disabled', st, k, { mandatoryApproval: true }), 'NONE'); });
t('mandatory beats Disabled (logged in): password', () => assert.equal(v('disabled', 'LOGGED_IN', 'WRITE', { mandatoryPassword: true }), 'PASSWORD'));
t('mandatory, logged out: the login satisfies it', () => assert.equal(v('appRequired', 'LOGGED_OUT', 'WRITE', { mandatoryPassword: true }), 'LOGIN'));
t('mandatory beats every mode when logged in', () => { for (const mode of ['appRequired', 'firstApproved', 'methodRequired', 'persisted']) assert.equal(v(mode, 'LOGGED_IN', 'BROWSE', { mandatoryPassword: true }), 'PASSWORD', mode); });
t('Initial: browse while logged out is free', () => assert.equal(v('firstApproved', 'LOGGED_OUT', 'BROWSE'), 'NONE'));
t('Initial: browse while UNKNOWN is free (nothing to wait for)', () => assert.equal(v('firstApproved', 'UNKNOWN', 'BROWSE'), 'NONE'));
t('Initial: a write while logged out asks the login', () => assert.equal(v('firstApproved', 'LOGGED_OUT', 'WRITE'), 'LOGIN'));
t('Initial: a write while logged in: Approve when on', () => assert.equal(v('firstApproved', 'LOGGED_IN', 'WRITE', { mandatoryApproval: true }), 'APPROVE'));
t('Initial: a write while logged in: nothing when approval is off', () => assert.equal(v('firstApproved', 'LOGGED_IN', 'WRITE'), 'NONE'));
t('App: UNKNOWN waits, draws nothing', () => { assert.equal(v('appRequired', 'UNKNOWN', 'BROWSE'), 'WAIT'); assert.equal(v('appRequired', 'UNKNOWN', 'WRITE'), 'WAIT'); });
t('App: logged out shows the login for any panel and any write', () => { assert.equal(v('appRequired', 'LOGGED_OUT', 'BROWSE'), 'LOGIN'); assert.equal(v('appRequired', 'LOGGED_OUT', 'WRITE'), 'LOGIN'); });
t('App: logged in browses freely', () => assert.equal(v('appRequired', 'LOGGED_IN', 'BROWSE'), 'NONE'));
t('App: a write is Approve when on, else nothing', () => { assert.equal(v('appRequired', 'LOGGED_IN', 'WRITE', { mandatoryApproval: true }), 'APPROVE'); assert.equal(v('appRequired', 'LOGGED_IN', 'WRITE'), 'NONE'); });
t('All: UNKNOWN waits; logged out is the login', () => { assert.equal(v('methodRequired', 'UNKNOWN', 'BROWSE'), 'WAIT'); assert.equal(v('methodRequired', 'LOGGED_OUT', 'BROWSE'), 'LOGIN'); });
t('All: logged in browses freely', () => assert.equal(v('methodRequired', 'LOGGED_IN', 'BROWSE'), 'NONE'));
t('All: every write asks the password, never Approve (the password IS the approval)', () => { assert.equal(v('methodRequired', 'LOGGED_IN', 'WRITE'), 'PASSWORD'); assert.equal(v('methodRequired', 'LOGGED_IN', 'WRITE', { mandatoryApproval: true }), 'PASSWORD'); });
t('Persisted is App-like after the restore: Approve per write (owner Q-P1)', () => { assert.equal(v('persisted', 'LOGGED_IN', 'WRITE', { mandatoryApproval: true }), 'APPROVE'); assert.equal(v('persisted', 'LOGGED_IN', 'WRITE'), 'NONE'); assert.equal(v('persisted', 'LOGGED_OUT', 'BROWSE'), 'LOGIN'); assert.equal(v('persisted', 'UNKNOWN', 'BROWSE'), 'WAIT'); });
t('an unknown mode behaves as App (the default)', () => { for (const st of STATES) for (const k of KINDS) assert.equal(v('nonsense', st, k, { mandatoryApproval: true }), v('appRequired', st, k, { mandatoryApproval: true })); });

// invariants over the whole input space
const MODES = ['appRequired', 'firstApproved', 'methodRequired', 'persisted', 'disabled', 'nonsense'];
t('no prompt of any kind unless logged in (UNKNOWN or LOGGED_OUT never gives PASSWORD / APPROVE)', () => {
  for (const mode of MODES) for (const st of ['UNKNOWN', 'LOGGED_OUT']) for (const k of KINDS) for (const mp of [false, true]) for (const ma of [false, true]) {
    const r = v(mode, st, k, { mandatoryPassword: mp, mandatoryApproval: ma });
    assert.ok(r !== 'PASSWORD' && r !== 'APPROVE', [mode, st, k, mp, ma, r].join(' '));
  }
});
t('UNKNOWN never shows the login (no flash): only WAIT or NONE', () => {
  for (const mode of MODES) for (const k of KINDS) for (const mp of [false, true]) for (const ma of [false, true]) {
    const r = v(mode, 'UNKNOWN', k, { mandatoryPassword: mp, mandatoryApproval: ma });
    assert.ok(r === 'WAIT' || r === 'NONE', [mode, k, mp, ma, r].join(' '));
  }
});
t('LOGGED_OUT never gives NONE for a write, except Disabled without the mandatory flag', () => {
  for (const mode of MODES) for (const mp of [false, true]) {
    const r = v(mode, 'LOGGED_OUT', 'WRITE', { mandatoryPassword: mp });
    if (mode === 'disabled' && !mp) assert.equal(r, 'NONE'); else assert.equal(r, 'LOGIN', mode + ' ' + mp);
  }
});
t('All never gives APPROVE (the password replaces it)', () => {
  for (const st of STATES) for (const k of KINDS) for (const mp of [false, true]) for (const ma of [false, true]) assert.notEqual(v('methodRequired', st, k, { mandatoryPassword: mp, mandatoryApproval: ma }), 'APPROVE');
});
t('the gate is closed exactly when a BROWSE needs something', () => {
  assert.equal(isLoginGateClosed('appRequired', 'LOGGED_OUT'), true);
  assert.equal(isLoginGateClosed('appRequired', 'UNKNOWN'), true);
  assert.equal(isLoginGateClosed('appRequired', 'LOGGED_IN'), false);
  assert.equal(isLoginGateClosed('firstApproved', 'LOGGED_OUT'), false);
  assert.equal(isLoginGateClosed('disabled', 'LOGGED_OUT'), false);
  assert.equal(isLoginGateClosed('methodRequired', 'LOGGED_OUT'), true);
  assert.equal(isLoginGateClosed('persisted', 'UNKNOWN'), true);
});

// the login state from the facts
t('deriveLoginState: UNKNOWN until the boot is resolved, whatever the other facts say', () => { assert.equal(deriveLoginState({ bootResolved: false, hasWalletPassword: true, isWalletLocked: false }), 'UNKNOWN'); assert.equal(deriveLoginState({ bootResolved: false, hasWalletPassword: null, isWalletLocked: true }), 'UNKNOWN'); });
t('deriveLoginState: logged in only with a password set and the wallet unlocked', () => { assert.equal(deriveLoginState({ bootResolved: true, hasWalletPassword: true, isWalletLocked: false }), 'LOGGED_IN'); assert.equal(deriveLoginState({ bootResolved: true, hasWalletPassword: true, isWalletLocked: true }), 'LOGGED_OUT'); assert.equal(deriveLoginState({ bootResolved: true, hasWalletPassword: false, isWalletLocked: false }), 'LOGGED_OUT'); assert.equal(deriveLoginState({ bootResolved: true, hasWalletPassword: null, isWalletLocked: false }), 'LOGGED_OUT'); });

console.log((failed === 0 ? 'ALL ' : 'SOME ') + passed + '/' + (passed + failed) + ' passed' + (m ? ' (MUTANT=' + m + ')' : ''));
process.exit(failed === 0 ? 0 : 1);
