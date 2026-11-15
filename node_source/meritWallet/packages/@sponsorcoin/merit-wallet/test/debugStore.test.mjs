// File: test/debugStore.test.mjs
//
// The debug dump (src/debug/debugStore.ts): one fixed layout in every app, no secrets, no layout noise.
// Run: node test/debugStore.test.mjs      MUTANT=leak|noise|order|unregistered|urlLeak run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const ts = req('typescript');
let src = fs.readFileSync(path.join(HERE, '..', 'src', 'debug', 'debugStore.ts'), 'utf8');
const M = process.env.MUTANT;
if (M === 'urlLeak') src = src.replace('rpcUrl: hideAddressSecrets(i.rpcUrl)', "rpcUrl: i.rpcUrl ?? '(none)'");
if (M === 'leak') src = src.replace("SECRET_KEY.test(key) ? '(hidden)' : ", '');
if (M === 'noise') src = src.replace('if (NOISE.test(`${who}:${what}`) || NOISE.test(what)) return;', '');
if (M === 'order') src = src.replace('const names = [...DEBUG_SECTIONS,', 'const names = [...[...DEBUG_SECTIONS].reverse(),');
if (M === 'unregistered') src = src.replace("out.push('(not provided)');", "out.push('');");
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const m = { exports: {} };
new Function('require', 'module', 'exports', js)(req, m, m.exports);
const { createDebugStore, registerHostDebug, hideAddressSecrets, DEBUG_SECTIONS } = m.exports;

const NL = String.fromCharCode(10);
let n = 0;
const test = async (name, fn) => {
  try {
    await fn();
    n += 1;
    console.log('ok -', name);
  } catch (e) {
    console.log('FAIL -', name, e.message.split(NL)[0]);
    process.exitCode = 1;
  }
};
const T = () => Date.UTC(2026, 10, 14, 12, 0, 0);
const lines = (text) => text.split(NL);

await test('the dump has the same section headings in the same order in every app, provided or not', async () => {
  const web = createDebugStore(T);
  const ext = createDebugStore(T);
  registerHostDebug(web, () => ({ app: 'web', chainId: 31337, rpcUrl: 'http://x', contract: '0xabc' }));
  registerHostDebug(ext, () => ({ app: 'extension', chainId: 31337, rpcUrl: 'http://x', contract: '0xabc' }));
  ext.setSection('worker', () => ({ lastLines: ['a'] }));
  const headings = (text) => lines(text).filter((l) => l.startsWith('## ')).map((l) => l.replace(/\(\d+\)/, '').trim());
  const a = headings(await web.buildDump(T()));
  const b = headings(await ext.buildDump(T()));
  assert.deepEqual(a, b);
  assert.deepEqual(a.slice(0, DEBUG_SECTIONS.length), DEBUG_SECTIONS.map((s) => `## ${s}`));
});
await test('a section the host did not provide says so instead of vanishing', async () => {
  const store = createDebugStore(T);
  const text = await store.buildDump(T());
  assert.ok(text.includes(`## rewards${NL}(not provided)`));
});
await test('two hosts with the same data give identical lines except the app name', async () => {
  const mk = async (app) => {
    const s = createDebugStore(T);
    registerHostDebug(s, () => ({ app, build: '1', chainId: 31337, rpcUrl: 'http://x', contract: '0xabc' }));
    s.setSection('clock', () => ({ chainNowSeconds: '100', latestBlockSeconds: '99' }));
    return lines(await s.buildDump(T())).filter((l) => !l.startsWith('app: '));
  };
  assert.deepEqual(await mk('web'), await mk('extension'));
});
await test('secrets are hidden, whatever the section holds', async () => {
  const s = createDebugStore(T);
  s.setSection('app', () => ({ password: 'hunter2', mnemonic: 'a b c', nested: { privateKey: '0x1', seedPhrase: 'x', ok: 'fine' }, passkeyCredentialId: 'abc' }));
  const text = await s.buildDump(T());
  for (const secret of ['hunter2', 'a b c', '"0x1"', 'seedPhrase":"x']) assert.equal(text.includes(secret), false, secret);
  assert.ok(text.includes('fine'));
});
await test('bigint and error values print as text', async () => {
  const s = createDebugStore(T);
  s.setSection('clock', () => ({ n: 12345678901234567890n, e: new Error('boom') }));
  const text = await s.buildDump(T());
  assert.ok(text.includes('12345678901234567890'));
  assert.ok(text.includes('Error: boom'));
});
await test('layout noise is kept out of the trace; real events stay', async () => {
  const s = createDebugStore(T);
  s.log('engine', 'useStepPanel:hide {"invoker":"x"}');
  s.log('engine', 'TradeButtonSlot:state {}');
  s.log('panel', 'side panel loaded');
  const text = await s.buildDump(T());
  assert.ok(text.includes('## trace (1)'));
  assert.ok(text.includes('panel: side panel loaded'));
});
await test('the trace and the errors are rings (the newest are kept)', async () => {
  const s = createDebugStore(T);
  for (let i = 0; i < 400; i += 1) s.log('x', `line ${i}`);
  for (let i = 0; i < 80; i += 1) s.error('error', `e${i}`);
  const text = await s.buildDump(T());
  assert.ok(text.includes('## trace (300)'));
  assert.ok(text.includes('line 399'));
  assert.equal(text.includes(`line 99${NL}`), false);
  assert.ok(text.includes('## errors (50)'));
  assert.ok(text.includes('e79'));
});
await test('a section that throws is reported, the rest still prints', async () => {
  const s = createDebugStore(T);
  s.setSection('clock', () => {
    throw new Error('rpc down');
  });
  s.setSection('rewards', () => ({ ok: 'yes' }));
  const text = await s.buildDump(T());
  assert.ok(text.includes('could not read: rpc down'));
  assert.ok(text.includes('ok: yes'));
});
await test('the dump time is UTC, not the computer zone', async () => {
  const s = createDebugStore(T);
  assert.ok((await s.buildDump(T())).includes('dumpedAtUtc: 2026-11-14T12:00:00.000Z'));
});
await test('the switch tells its listeners and keeps its value', () => {
  const s = createDebugStore(T);
  let calls = 0;
  const off = s.subscribe(() => {
    calls += 1;
  });
  s.setEnabled(true);
  s.setEnabled(true);
  assert.equal(s.isEnabled(), true);
  assert.equal(calls, 1);
  off();
  s.setEnabled(false);
  assert.equal(calls, 1);
});
await test('a node address keeps its host and loses its path and query (access keys)', async () => {
  assert.equal(hideAddressSecrets('https://rpc.sponsorcoin.org/f5b4d4b4a2614a54'), 'https://rpc.sponsorcoin.org/(path hidden)');
  assert.equal(hideAddressSecrets('https://node.example/v2?apikey=abc'), 'https://node.example/(path hidden)');
  assert.equal(hideAddressSecrets('http://127.0.0.1:8545'), 'http://127.0.0.1:8545');
  assert.equal(hideAddressSecrets(undefined), '(none)');
  const s = createDebugStore(T);
  registerHostDebug(s, () => ({ app: 'web', rpcUrl: 'https://rpc.sponsorcoin.org/SECRETKEY123' }));
  assert.equal((await s.buildDump(T())).includes('SECRETKEY123'), false);
});
await test('the server line keeps plain text and hides the path of an address', async () => {
  const mk = async (server) => {
    const s = createDebugStore(T);
    registerHostDebug(s, () => ({ app: 'web', server }));
    return lines(await s.buildDump(T())).find((l) => l.startsWith('server: '));
  };
  assert.equal(await mk('none (no hosted app)'), 'server: none (no hosted app)');
  assert.equal(await mk('https://sponsorcoin.org'), 'server: https://sponsorcoin.org');
  assert.equal(await mk('https://host.example/KEY123'), 'server: https://host.example/(path hidden)');
  assert.equal(await mk(undefined), 'server: (none)');
});
console.log(`${n} passed`);
