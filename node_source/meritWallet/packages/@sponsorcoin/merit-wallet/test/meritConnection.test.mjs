// File: test/meritConnection.test.mjs
//
// Tests for withMeritConnection (src/auth/meritConnection.ts): a Merit wallet's view of another Merit wallet's accounts as an Authenticator, over a merit-connect client. The same wrapper serves the web app (Merit (Ext)) and the extension
// (Merit (Web App)); the client here is a fake with the same calls. Run: node test/meritConnection.test.mjs
// MUTANT=accountsSkipHandshake|disconnectNoRevoke|accountChangeNotFiltered|noLinkChange run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const ts = req('typescript');
let src = fs.readFileSync(path.join(HERE, '..', 'src', 'auth', 'meritConnection.ts'), 'utf8').replace(/\r\n/g, '\n');
const m = process.env.MUTANT;
const swap = (text, from, to) => {
  assert.ok(text.includes(from), 'mutant anchor missing: ' + from);
  return text.replace(from, to);
};
// the account list does not run the handshake
if (m === 'accountsSkipHandshake') src = swap(src, 'return asAccounts((await client.handshake(side)).shared, base.id);', 'return [];');
// disconnecting does not tell the other wallet
if (m === 'disconnectNoRevoke') src = swap(src, 'await client.revoke(side);', '');
// the wallet\'s own account-change events are not filtered (the kept lists decide)
if (m === 'accountChangeNotFiltered') src = swap(src, "if (change !== 'accountsChanged') listener(change);", 'listener(change);');
// removing an account does not tell the other wallet (row 4: it would report our own action back as Disconnected by Remote)
if (m === 'removeNotForwarded') src = swap(src, 'if (forget) overrides.removeAccount = async (address) => forget.call(client, side, address);', '');
// the link coming up or going down does not reload the list
if (m === 'noLinkChange') src = swap(src, "const offLink = client.onConnectionChange(side, () => listener('accountsChanged'));", 'const offLink = () => undefined;');
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
new Function('require', 'module', 'exports', js)((s) => (s === './injectedAuthenticator' ? { translateProviderError: (e, id, label) => Object.assign(new Error(`${label}: ${e.message}`), { id }) } : req(s)), mod, mod.exports);
const { withMeritConnection } = mod.exports;

const results = [];
const test = async (name, fn) => {
  try {
    await fn();
    results.push(['PASS', name]);
  } catch (e) {
    results.push(['FAIL', name + ' :: ' + (e && e.message)]);
  }
};

const A = '0xaaaa000000000000000000000000000000000001';
const B = '0xbbbb000000000000000000000000000000000002';

function fixture() {
  const calls = [];
  const link = new Set();
  const state = { shared: [A], known: [{ address: A, connected: true }, { address: B, connected: false }], requestAnswer: [A, B], requestError: null };
  const client = {
    async handshake(side) {
      calls.push(['handshake', side]);
      return { shared: state.shared };
    },
    async listAccounts(side) {
      calls.push(['listAccounts', side]);
      return state.known;
    },
    async setAccountConnected(side, address, connected) {
      calls.push(['setAccountConnected', side, address, connected]);
    },
    async requestAccounts(side) {
      calls.push(['requestAccounts', side]);
      if (state.requestError) throw state.requestError;
      return state.requestAnswer;
    },
    async revoke(side) {
      calls.push(['revoke', side]);
    },
    async forgetAccount(side, address) {
      calls.push(['forgetAccount', side, address]);
    },
    onConnectionChange(side, listener) {
      link.add(listener);
      return () => link.delete(listener);
    },
  };
  const baseListeners = new Set();
  const base = {
    id: 'merit-extension',
    label: 'Merit extension',
    capabilities: {},
    async status() {
      return { available: true, unlocked: true };
    },
    async accounts() {
      return [];
    },
    async signMessage() {
      return '0xsig';
    },
    onChange(listener) {
      baseListeners.add(listener);
      return () => baseListeners.delete(listener);
    },
  };
  const listListeners = new Set();
  const noticeListeners = new Set();
  const wrapped = withMeritConnection(base, {
    client,
    side: 'EXT',
    onListChange: (l) => {
      listListeners.add(l);
      return () => listListeners.delete(l);
    },
    onNotice: (l) => {
      noticeListeners.add(l);
      return () => noticeListeners.delete(l);
    },
  });
  return { wrapped, calls, state, link, baseListeners, listListeners, noticeListeners };
}

await test('accounts() is the HANDSHAKE (the re-send after a start or a lost link, the pull after that), listed with the wallet id as source', async () => {
  const f = fixture();
  assert.deepEqual(await f.wrapped.accounts(), [{ address: A, source: 'merit-extension' }]);
  assert.deepEqual(f.calls, [['handshake', 'EXT']]);
});

await test('knownAccounts() lists every account, connected or not (a disconnected one stays listed)', async () => {
  const f = fixture();
  assert.deepEqual(await f.wrapped.knownAccounts(), [{ address: A, connected: true }, { address: B, connected: false }]);
});

await test('setAccountConnected() changes ONE account through the client', async () => {
  const f = fixture();
  await f.wrapped.setAccountConnected(B, true);
  await f.wrapped.setAccountConnected(A, false);
  assert.deepEqual(f.calls, [['setAccountConnected', 'EXT', B, true], ['setAccountConnected', 'EXT', A, false]]);
});

await test('removeAccount() (row 4, X3) goes to the client\'s forgetAccount for THIS side: the other wallet is told, then the account is forgotten here', async () => {
  const f = fixture();
  assert.equal(typeof f.wrapped.removeAccount, 'function');
  await f.wrapped.removeAccount(B);
  assert.deepEqual(f.calls, [['forgetAccount', 'EXT', B]]);
});

await test('selectAccounts() and connect() open the other wallet\'s selector and answer with the accounts it kept', async () => {
  const f = fixture();
  assert.deepEqual((await f.wrapped.selectAccounts()).map((a) => a.address), [A, B]);
  assert.deepEqual((await f.wrapped.connect()).map((a) => a.address), [A, B]);
  assert.deepEqual(f.calls.map((c) => c[0]), ['requestAccounts', 'requestAccounts']);
});

await test('a refusal of the selector is translated with the wallet\'s words', async () => {
  const f = fixture();
  f.state.requestError = Object.assign(new Error('You closed the account selector.'), { code: 4001 });
  await assert.rejects(() => f.wrapped.selectAccounts(), /Merit extension: You closed/);
});

await test('disconnect() tells the other wallet (it disconnects all of its accounts); nothing else is asked', async () => {
  const f = fixture();
  await f.wrapped.disconnect();
  assert.deepEqual(f.calls, [['revoke', 'EXT']]);
});

await test('onChange: a list change and the link coming up both reload the list; the wallet\'s own account events do not, its chain events still arrive', async () => {
  const f = fixture();
  const seen = [];
  const off = f.wrapped.onChange((c) => seen.push(c));
  f.listListeners.forEach((l) => l());
  f.link.forEach((l) => l());
  f.baseListeners.forEach((l) => l('accountsChanged'));
  f.baseListeners.forEach((l) => l('chainChanged'));
  assert.deepEqual(seen, ['accountsChanged', 'accountsChanged', 'chainChanged']);
  off();
  assert.equal(f.listListeners.size + f.link.size + f.baseListeners.size, 0, 'unsubscribed everywhere');
});

await test('onNotice hands the host\'s notices through; a host with none leaves the wallet without it', async () => {
  const f = fixture();
  const said = [];
  const off = f.wrapped.onNotice((x) => said.push(x));
  f.noticeListeners.forEach((l) => l('hello'));
  assert.deepEqual(said, ['hello']);
  off();
  assert.equal(f.noticeListeners.size, 0);
  const bare = withMeritConnection({ id: 'x', label: 'X', capabilities: {}, onChange: () => () => undefined }, { client: { onConnectionChange: () => () => undefined }, side: 'EXT' });
  assert.equal(bare.onNotice, undefined);
});

await test('everything else of the wallet is untouched (signing, status, label)', async () => {
  const f = fixture();
  assert.equal(f.wrapped.label, 'Merit extension');
  assert.equal(await f.wrapped.signMessage(A, 'hi'), '0xsig');
  assert.deepEqual(await f.wrapped.status(), { available: true, unlocked: true });
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
