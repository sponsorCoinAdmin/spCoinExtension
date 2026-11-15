// File: test/walletName.test.mjs
//
// Tests for the one name of a wallet (src/auth/authenticator.ts walletName, docs/design/accountAuthDesign.txt section 18 section 3): the same wallet has the same name wherever it is seen, two Merit wallets are never confused, and every list that names a wallet uses it.
// Run: node test/walletName.test.mjs
// MUTANT=extensionSeenFromWeb|browserVsDev|phonePlatformIgnored|hardwareKind|metamaskCase run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const ts = req('typescript');
const SRC = path.join(HERE, '..', 'src');
const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8').replace(/\r\n/g, '\n');
let auth = read('auth/authenticator.ts');
const mutate = (from, to) => { assert.ok(auth.includes(from), 'mutant anchor missing: ' + from); auth = auth.replace(from, to); };
const m = process.env.MUTANT;
// the web page's view of the extension gets a different name from the extension's own
if (m === 'extensionSeenFromWeb') mutate("if (id === 'localVault' || id === 'injected:org.sponsorcoin.merit') return 'Merit (Ext)';", "if (id === 'localVault') return 'Merit (Ext)';\n  if (id === 'injected:org.sponsorcoin.merit') return 'Merit extension';");
// the dev keystore and the browser vault both read as the web wallet
if (m === 'browserVsDev') mutate("if (id === 'serverKeystore') return 'Merit Wallet (Web Dev Server)';", "if (id === 'serverKeystore') return 'Merit Wallet (Web)';");
// a phone wallet ignores the platform it reports
if (m === 'phonePlatformIgnored') mutate("return platform ? `Merit Wallet (${PLATFORM_WORDS[platform]})` : 'Merit Wallet (Phone)';", "return 'Merit Wallet (Phone)';");
// a hardware wallet is not named by its own device
if (m === 'hardwareKind') mutate("return `${kind.charAt(0).toUpperCase()}${kind.slice(1)} (Hardware)`;", "return 'Hardware';");
// MetaMask is named like a Merit wallet
if (m === 'metamaskCase') mutate("if (id === 'injected:io.metamask') return 'MetaMask';", "if (id === 'injected:io.metamask') return 'Merit Wallet (Web)';");
const js = ts.transpileModule(auth, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
new Function('require', 'module', 'exports', js)((id) => req(id), mod, mod.exports);
const { walletName } = mod.exports;

const results = [];
const test = async (name, fn) => {
  try {
    await fn();
    results.push(['PASS', name]);
  } catch (e) {
    results.push(['FAIL', name + ' :: ' + (e && e.message)]);
  }
};

await test('every wallet has its own name: the product and, in brackets, where it runs', () => {
  assert.equal(walletName('browserVault'), 'Merit Wallet (Web)');
  assert.equal(walletName('localVault'), 'Merit (Ext)');
  assert.equal(walletName('serverKeystore'), 'Merit (Web App)');
  assert.equal(walletName('injected:io.metamask'), 'MetaMask');
});

await test('the web page that connects to the extension sees the SAME wallet under the SAME name', () => {
  assert.equal(walletName('injected:org.sponsorcoin.merit'), walletName('localVault'));
});

await test('the dev keystore is never mistaken for the browser vault, and no two wallets share a name', () => {
  const ids = ['serverKeystore', 'browserVault', 'localVault', 'injected:io.metamask', 'hardware:ledger'];
  const names = ids.map((id) => walletName(id));
  assert.equal(new Set(names).size, ids.length, names.join(' | '));
});

await test('a phone wallet is named by the platform it reports (Android, I-Phone), "Phone" when it reports none', () => {
  assert.equal(walletName('deviceVault', 'android'), 'Merit Wallet (Android)');
  assert.equal(walletName('deviceVault', 'iphone'), 'Merit Wallet (I-Phone)');
  assert.equal(walletName('deviceVault'), 'Merit Wallet (Phone)');
  assert.notEqual(walletName('deviceVault', 'android'), walletName('deviceVault', 'iphone'));
});

await test('a hardware wallet is named by its own device; an unknown injected wallet by its identity', () => {
  assert.equal(walletName('hardware:ledger'), 'Ledger (Hardware)');
  assert.equal(walletName('hardware:trezor'), 'Trezor (Hardware)');
  assert.equal(walletName('injected:com.example.wallet'), 'com.example.wallet');
});

// the lists that name a wallet read the name from the package (walletName) and not from a host's own words
const forbidden = [
  ['wallet/approverAccounts.ts', /label: backend\.name,/],
  ['wallet/accountSigning.ts', /label: info\?\.name \?\? id,/],
  ['auth/approvalWaiting.ts', /label: authenticatorName\(authenticator\)/],
  ['wallet/wallet.ts', /name: authenticatorName\(authenticator\),/],
];
for (const [file, pattern] of forbidden) {
  await test(`${file} takes the wallet's name from authenticatorName (the name the authenticator supplies, the walletName table only as its fallback)`, () => {
    assert.match(read(file), pattern);
  });
}

let failed = 0;
for (const [status, text] of results) {
  console.log(status + ' ' + text);
  if (status === 'FAIL') failed += 1;
}
console.log(failed ? '\n' + failed + ' FAILED' : '\nall ' + results.length + ' passed');
process.exit(failed ? 1 : 0);
