// File: test/approvalLifecycle.test.mjs
//
// docs/meritMigration.txt row 28: the approval lifecycle (src/approval/approvalLifecycle.ts) the web's MeritApprovalOrchestrator used to hold. Pins the decisions and RUNS the hook against a small fake of React's hooks and the approval store,
// so the order of effects (clear when the message panel shows, fallback timer, open the wallet once per new request) is checked, not only read.
// Run: node test/approvalLifecycle.test.mjs
// MUTANT=noFallback|openEveryRender|clearWithoutPanel run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ts = createRequire(import.meta.url)('typescript');
let src = fs.readFileSync(path.join(HERE, '..', 'src', 'approval', 'approvalLifecycle.ts'), 'utf8').split(String.fromCharCode(13)).join('');
const m = process.env.MUTANT;
if (m === 'noFallback') src = src.replace("const timer = setTimeout(() => clearSettledMeritApproval(), SETTLING_FALLBACK_MS);", "const timer = 0;");
if (m === 'openEveryRender') src = src.replace("if (!isNew) return;", "");
if (m === 'clearWithoutPanel') src = src.replace("return request?.phase === 'settling' && messagePanelVisible;", "return request?.phase === 'settling';");
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;

// ---- a minimal fake of the approval store and of React's hooks (state, ref, effect with dependencies) ----
const store = { pending: null, listeners: new Set(), cleared: 0 };
const approval = {
  getPendingMeritApproval: () => store.pending,
  subscribeMeritApproval: (l) => { store.listeners.add(l); return () => store.listeners.delete(l); },
  clearSettledMeritApproval: () => { store.cleared += 1; if (store.pending && store.pending.phase === 'settling') { store.pending = null; store.listeners.forEach((l) => l(null)); } },
};
const publish = (req) => { store.pending = req; store.listeners.forEach((l) => l(req)); };

let hooks, cursor, rerender, timers;
const fakeReact = {
  useState: (init) => { const i = cursor++; if (!(i in hooks)) hooks[i] = { v: init }; return [hooks[i].v, (v) => { hooks[i].v = v; rerender(); }]; },
  useRef: (init) => { const i = cursor++; if (!(i in hooks)) hooks[i] = { current: init }; return hooks[i]; },
  useEffect: (fn, deps) => { const i = cursor++; const prev = hooks[i]; const changed = !prev || !deps || !prev.deps || deps.some((d, k) => d !== prev.deps[k]); if (changed) { hooks[i] = { deps, pending: fn, cleanup: prev && prev.cleanup }; hooks.__effects.push(i); } },
};
const clock = { now: 0, queue: [] };
const fakeTimers = { setTimeout: (fn, ms) => { const id = clock.queue.length; clock.queue.push({ fn, at: clock.now + ms, live: true }); return id; }, clearTimeout: (id) => { if (clock.queue[id]) clock.queue[id].live = false; } };
const mod = { exports: {} };
new Function('require', 'module', 'exports', 'setTimeout', 'clearTimeout', js)((id) => (id === 'react' ? fakeReact : approval), mod, mod.exports, fakeTimers.setTimeout, fakeTimers.clearTimeout);
const { useMeritApprovalLifecycle, shouldClearSettled, isNewApprovalRequest, SETTLING_FALLBACK_MS } = mod.exports;

function mount(props) {
  hooks = { __effects: [] }; cursor = 0; timers = clock; store.pending = null; store.cleared = 0; clock.now = 0; clock.queue = [];
  const host = { opened: 0, props: { ...props, openWallet: () => { host.opened += 1; } } };
  const render = () => { cursor = 0; hooks.__effects = []; useMeritApprovalLifecycle(host.props);
    for (const i of hooks.__effects) { const h = hooks[i]; if (h.cleanup) h.cleanup(); const out = h.pending(); h.cleanup = typeof out === 'function' ? out : undefined; } };
  rerender = render; render();
  return { host, render, advance: (ms) => { clock.now += ms; for (const t of clock.queue) if (t.live && t.at <= clock.now) { t.live = false; t.fn(); } } };
}

const results = [];
const test = (name, fn) => { try { fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

test('the decisions: clear only a settling request whose outcome is on screen; a request is new when its id differs', () => {
  assert.equal(shouldClearSettled({ phase: 'settling' }, true), true);
  assert.equal(shouldClearSettled({ phase: 'settling' }, false), false);
  assert.equal(shouldClearSettled({ phase: 'decide' }, true), false);
  assert.equal(shouldClearSettled(null, true), false);
  assert.equal(isNewApprovalRequest(null, { id: 1 }), true);
  assert.equal(isNewApprovalRequest(1, { id: 1 }), false);
  assert.equal(isNewApprovalRequest(1, { id: 2 }), true);
  assert.equal(isNewApprovalRequest(1, null), false);
  assert.equal(SETTLING_FALLBACK_MS, 60000);
});
test('a new request opens the wallet ONCE, however often the host re-renders', () => {
  const t = mount({ messagePanelVisible: false });
  assert.equal(t.host.opened, 0);
  publish({ id: 1, phase: 'decide' });
  t.render(); t.render(); t.render();
  assert.equal(t.host.opened, 1);
  // the host's openWallet changes identity (a rebuilt callback) while the SAME request is pending: that re-runs the effect, and it must not open the wallet again
  t.host.props.openWallet = () => { t.host.opened += 1; };
  t.render(); t.render();
  assert.equal(t.host.opened, 1);
  publish({ id: 2, phase: 'decide' });
  assert.equal(t.host.opened, 2);
});
test('a settling request is cleared when the message panel shows', () => {
  const t = mount({ messagePanelVisible: false });
  publish({ id: 1, phase: 'settling' });
  assert.equal(store.cleared, 0);
  t.host.props.messagePanelVisible = true; t.render();
  assert.equal(store.cleared >= 1, true);
});
test('a settling request nobody shows is cleared after the fallback time, not before', () => {
  const t = mount({ messagePanelVisible: false });
  publish({ id: 1, phase: 'settling' });
  t.advance(SETTLING_FALLBACK_MS - 1);
  assert.equal(store.cleared, 0);
  t.advance(1);
  assert.equal(store.cleared, 1);
});
test('a request still being decided is never cleared by the timer', () => {
  const t = mount({ messagePanelVisible: true });
  publish({ id: 1, phase: 'decide' });
  t.advance(SETTLING_FALLBACK_MS * 3);
  assert.equal(store.cleared, 0);
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
