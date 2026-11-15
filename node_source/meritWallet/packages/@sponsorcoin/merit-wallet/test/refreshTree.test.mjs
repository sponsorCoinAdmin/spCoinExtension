// File: test/refreshTree.test.mjs
//
// 2026-11-09 (owner design): Refresh is one tree (src/refresh/refreshTree.ts). Every node's refreshPanelCache runs, then every node's updatePanelMethodCalls; a failing node does not stop the others; a cache key is worked once per refresh;
// a refresh asked for while one runs joins it; a node that is taken out of the tree is not refreshed. 
// Run: node test/refreshTree.test.mjs
// MUTANT=reloadBeforeInvalidate|stopOnError|noOnce|noJoin|noDetach run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ts = createRequire(import.meta.url)('typescript');
const m = process.env.MUTANT;
const read = (...p) => fs.readFileSync(path.join(HERE, '..', ...p), 'utf8').split(String.fromCharCode(13)).join('');
const swap = (text, from, to) => { assert.ok(text.includes(from), 'mutant anchor missing: ' + from); return text.replace(from, to); };
const load = (src) => {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', js)(() => ({}), mod, mod.exports);
  return mod.exports;
};

let tree = read('src', 'refresh', 'refreshTree.ts');
if (m === 'reloadBeforeInvalidate') tree = swap(tree, "await phase('refreshPanelCache');\n    await phase('updatePanelMethodCalls');", "await phase('updatePanelMethodCalls');\n    await phase('refreshPanelCache');");
if (m === 'stopOnError') tree = swap(tree, 'errors.push({ node: node.id, phase: name, error });', 'throw error;');
if (m === 'noOnce') tree = swap(tree, 'if (!once.has(key)) once.set(key, Promise.resolve().then(fn));', 'once.set(key, Promise.resolve().then(fn));');
if (m === 'noJoin') tree = swap(tree, 'if (!running) running =', 'running =');
if (m === 'noDetach') tree = swap(tree, 'node.parent?.children.delete(node);', '');
const { createRefreshTree, createRefreshNode, attachRefreshNode } = load(tree);

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };
const add = (parent, id, spec) => { const n = createRefreshNode(parent, id, spec); const off = attachRefreshNode(n); return { n, off }; };

await test('the tree is built from nodes under their parents, in order, and describes itself', () => {
  const t = createRefreshTree('W');
  const panel = add(t.root, 'NETWORK_PANEL', {});
  add(panel.n, 'image', {});
  add(panel.n, 'table', {});
  assert.deepEqual(t.describe(), ['W', 'W/NETWORK_PANEL', 'W/NETWORK_PANEL/image', 'W/NETWORK_PANEL/table']);
});
await test('a child can be attached before its parent (a React child effect runs first)', () => {
  const t = createRefreshTree('W');
  const parent = createRefreshNode(t.root, 'P', {});
  add(parent, 'child', {});
  attachRefreshNode(parent);
  assert.deepEqual(t.describe(), ['W', 'W/P', 'W/P/child']);
});
await test('every node refreshes its cache, and only then does any node update its method calls', async () => {
  const t = createRefreshTree('W');
  const log = [];
  const panel = add(t.root, 'A', { refreshPanelCache: () => log.push('inv A'), updatePanelMethodCalls: () => log.push('rel A') });
  add(panel.n, 'B', { refreshPanelCache: () => log.push('inv B'), updatePanelMethodCalls: () => log.push('rel B') });
  const report = await t.refresh();
  assert.deepEqual(log.slice(0, 2).sort(), ['inv A', 'inv B']);
  assert.deepEqual(log.slice(2).sort(), ['rel A', 'rel B']);
  assert.equal(report.nodes, 3);
  assert.deepEqual(report.errors, []);
  assert.equal(report.run, 1);
  assert.equal((await t.refresh()).run, 2);
});
await test('a node that fails is reported and the others still run both steps', async () => {
  const t = createRefreshTree('W');
  const log = [];
  add(t.root, 'bad', { refreshPanelCache: () => { throw new Error('boom'); }, updatePanelMethodCalls: () => log.push('rel bad') });
  add(t.root, 'good', { refreshPanelCache: () => log.push('inv good'), updatePanelMethodCalls: () => log.push('rel good') });
  const report = await t.refresh();
  assert.ok(log.includes('inv good') && log.includes('rel good') && log.includes('rel bad'), log.join());
  assert.equal(report.errors.length, 1);
  assert.equal(report.errors[0].node, 'bad');
  assert.equal(report.errors[0].phase, 'refreshPanelCache');
});
await test('a cache key is worked once per refresh however many nodes ask, and again on the next refresh', async () => {
  const t = createRefreshTree('W');
  let fetched = 0;
  const refresh = (ctx) => ctx.once('image:/a.png', async () => { fetched++; });
  add(t.root, 'one', { refreshPanelCache: refresh });
  add(t.root, 'two', { refreshPanelCache: refresh });
  await t.refresh();
  assert.equal(fetched, 1);
  await t.refresh();
  assert.equal(fetched, 2);
});
await test('a refresh asked for while one is running joins it', async () => {
  const t = createRefreshTree('W');
  let reloads = 0;
  add(t.root, 'slow', { updatePanelMethodCalls: async () => { reloads++; await new Promise((r) => setTimeout(r, 10)); } });
  const [a, b] = await Promise.all([t.refresh(), t.refresh()]);
  assert.equal(reloads, 1);
  assert.equal(a.run, b.run);
});
await test('a node taken out of the tree is not refreshed', async () => {
  const t = createRefreshTree('W');
  let reloads = 0;
  const gone = add(t.root, 'gone', { updatePanelMethodCalls: () => { reloads++; } });
  gone.off();
  await t.refresh();
  assert.equal(reloads, 0);
  assert.deepEqual(t.describe(), ['W']);
});
await test('the latest spec is used (a component replaces its callbacks every render)', async () => {
  const t = createRefreshTree('W');
  const log = [];
  const node = add(t.root, 'n', { updatePanelMethodCalls: () => log.push('old') });
  node.n.spec = { updatePanelMethodCalls: () => log.push('new') };
  await t.refresh();
  assert.deepEqual(log, ['new']);
});
let failed = 0;
for (const [status, name] of results) { console.log(status + ' ' + name); if (status === 'FAIL') failed++; }
process.exit(failed ? 1 : 0);
