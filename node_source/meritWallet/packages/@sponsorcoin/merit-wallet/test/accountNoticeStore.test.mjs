// File: test/accountNoticeStore.test.mjs
//
// Tests for the account notice store (src/auth/accountNoticeStore.ts): the notice that the other Merit wallet took accounts out of this wallet's list, shown once as a MESSAGE_PANEL popup with the accounts' icons.
// Run: node test/accountNoticeStore.test.mjs   MUTANT=noDedupe|sameId run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const ts = req('typescript');
let src = fs.readFileSync(path.join(HERE, '..', 'src', 'auth', 'accountNoticeStore.ts'), 'utf8').replace(/\r\n/g, '\n');
const swap = (text, from, to) => {
  assert.ok(text.includes(from), 'mutant anchor missing: ' + from);
  return text.replace(from, to);
};
// the same notice published again (a second screen, a replay) is a new notice
if (process.env.MUTANT === 'noDedupe') src = swap(src, 'if (key === lastKey && now - lastAt < RECENT_MS) return;', '');
// every notice has the same id: the popup would show only the first
if (process.env.MUTANT === 'sameId') src = swap(src, 'id: nextId++', 'id: 1');
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
new Function('module', 'exports', js)(mod, mod.exports);
const { accountNoticeStore } = mod.exports;

const results = [];
const test = (name, fn) => {
  try {
    accountNoticeStore.reset();
    fn();
    results.push(['PASS', name]);
  } catch (e) {
    results.push(['FAIL', name + ' :: ' + (e && e.message)]);
  }
};

const A = '0xaaaa000000000000000000000000000000000001';
const B = '0xbbbb000000000000000000000000000000000002';

test('a published notice is held with its message and its accounts, and listeners hear it', () => {
  let heard = 0;
  accountNoticeStore.subscribe(() => heard++);
  accountNoticeStore.publish('Disconnected by Remote', [A, B]);
  assert.equal(heard, 1);
  assert.deepEqual({ ...accountNoticeStore.get() }, { id: 1, message: 'Disconnected by Remote', addresses: [A, B] });
});

test('the same notice published again within a moment (the account list mounted twice, a replay) is ONE notice', () => {
  let heard = 0;
  accountNoticeStore.subscribe(() => heard++);
  accountNoticeStore.publish('Disconnected by Remote', [A]);
  accountNoticeStore.publish('Disconnected by Remote', [A.toUpperCase().replace('0X', '0x')]);
  assert.equal(heard, 1);
  assert.equal(accountNoticeStore.get().id, 1);
});

test('a different notice is a new one with a new id', () => {
  accountNoticeStore.publish('Disconnected by Remote', [A]);
  accountNoticeStore.publish('Disconnected by Remote', [B]);
  accountNoticeStore.publish('Account Does not Exist on Merit (Web App)\nRemoved from Local', [B]);
  assert.equal(accountNoticeStore.get().id, 3);
  assert.deepEqual(accountNoticeStore.get().addresses, [B]);
});

test('a notice with no accounts is allowed (the popup then shows the text only)', () => {
  accountNoticeStore.publish('Disconnected by Remote');
  assert.deepEqual(accountNoticeStore.get().addresses, []);
});

test('unsubscribed listeners hear nothing', () => {
  let heard = 0;
  const off = accountNoticeStore.subscribe(() => heard++);
  off();
  accountNoticeStore.publish('x', []);
  assert.equal(heard, 0);
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
