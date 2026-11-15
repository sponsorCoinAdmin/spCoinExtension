// File: test/hostCatalog.test.mjs
//
// Keeps the host interface catalog (spcoin-common/src/host/index.ts, docs/nodeSourceMigrationPlan.txt row 2) honest: every capability marked 'registered' has its registration function exported by the engine,
// and the web app's boot file (lib/utils/registerEngineTrace.ts) calls each of them; a 'builtin' capability needs no registration. Run: node test/hostCatalog.test.mjs
// MUTANT=dropWebCall removes one registration from the web boot text and must fail; MUTANT=wrongStatus flips a status and must fail.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..', '..', '..', '..', '..');
const read = (...p) => fs.readFileSync(path.join(ROOT, ...p), 'utf8');
let catalog = read('spCoinCommon', 'packages', '@sponsorcoin', 'spcoin-common', 'src', 'host', 'index.ts');
const engineIndex = read('spCoinExchangeEngine', 'packages', '@sponsorcoin', 'spcoin-exchange-engine', 'src', 'index.ts');
const panelsIndex = read('spCoinPanels', 'packages', '@sponsorcoin', 'spcoin-panels', 'src', 'index.ts');
let webBoot = fs.readFileSync(path.join(ROOT, '..', 'lib', 'utils', 'registerEngineTrace.ts'), 'utf8');
if (process.env.MUTANT === 'dropWebCall') webBoot = webBoot.replace('setTokenPathEnv(', 'noop(');
if (process.env.MUTANT === 'wrongStatus') catalog = catalog.replace("api: 'registered'", "api: 'target'");

const REGISTRATION = {
  trace: 'setEngineTrace',
  tokenRecordLoader: 'setTokenRecordLoader',
  appPublicClient: 'setAppPublicClientHook',
  chainPublicClient: 'setChainPublicClientHook',
  connectedAccountAddress: 'setConnectedAccountAddressHook',
  quoteService: 'setQuoteService',
  networkData: 'registerNetworkData',
  spCoinDeploymentMap: 'loadSpCoinDeploymentMap',
  tokenPathEnv: 'setTokenPathEnv',
  platform: 'setPlatformImage',
  api: 'setHostApiBase',
};
// the signer capability is registered through the authenticator registry, and the platform's navigation through its own function
const webAuthenticators = fs.readFileSync(path.join(ROOT, '..', 'lib', 'spCoin', 'webAuthenticators.ts'), 'utf8');
// The extension is a SEPARATE repo, a sibling of this one when both are checked out side by side (local work, the cross-app job). The CI job that runs the library tests checks out the web repo only, so what reads the extension's files is skipped there (it passes, marked skipped),
// instead of failing the whole library suite on a missing file (that failure kept every later test, and CI, from running).
const EXTENSION = process.env.EXTENSION_DIR ?? path.join(ROOT, '..', '..', 'spCoinExtension'); // EXTENSION_DIR points elsewhere (a folder that does not exist: what the web-only CI job sees)
const extensionPresent = fs.existsSync(path.join(EXTENSION, 'sidepanel.ts'));
const readExtension = (...p) => fs.readFileSync(path.join(EXTENSION, ...p), 'utf8');
const extensionSidepanel = extensionPresent ? readExtension('sidepanel.ts') : '';
const statusBlock = catalog.slice(catalog.indexOf('HOST_CAPABILITY_STATUS'));
const status = Object.fromEntries([...statusBlock.matchAll(/(\w+): '(registered|target|builtin)'/g)].map((m) => [m[1], m[2]]));

const results = [];
const test = (name, fn) => { try { fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };
// for what needs the extension repo next to this one
const testWithExtension = (name, fn) => (extensionPresent ? test(name, fn) : results.push(['PASS', name + ' (skipped: the extension repo is not checked out here)']));

test('the catalog lists 13 capabilities: 12 registered and 1 built in (storage)', () => {
  assert.equal(Object.keys(status).length, 13);
  assert.equal(Object.values(status).filter((v) => v === 'registered').length, 12);
  assert.equal(status.storage, 'builtin');
});
for (const [cap, fn] of Object.entries(REGISTRATION)) {
  test(`${cap}: ${fn} is exported by the engine and called by the web boot file`, () => {
    assert.equal(status[cap], 'registered', `${cap} should be marked registered`);
    assert.ok((cap === 'platform' ? panelsIndex : engineIndex).includes(fn), `${fn} is not exported by the engine`);
    assert.ok(webBoot.includes(fn + '('), `${fn} is not called in lib/utils/registerEngineTrace.ts`);
  });
}
test('signer: the web registers its authenticators in the authenticator registry', () => {
  assert.equal(status.signer, 'registered');
  assert.ok(/registry\.register\(|\.register\(/.test(webAuthenticators), 'the web registers no authenticator');
});
testWithExtension('signer: the extension registers its localVault authenticator', () => {
  assert.ok(readExtension('src', 'localVaultAuthenticator.ts').includes('localVault'), 'the extension registers no localVault authenticator');
});
test('platform navigation: setPlatformNavigation is exported by the panels and called by the web boot file', () => {
  assert.ok(panelsIndex.includes('setPlatformNavigation'));
  assert.ok(webBoot.includes('setPlatformNavigation('));
});
testWithExtension('the extension decides about the hosted API: it turns it OFF (disableHostApi) and the feeds go bundle-only (setFeedNetworkPolicy)', () => {
  assert.ok(extensionSidepanel.includes('disableHostApi('), 'sidepanel.ts does not turn the hosted API off');
  const bundledFeeds = readExtension('src', 'bundledFeeds.ts');
  assert.ok(/setFeedNetworkPolicy\(\{[^}]*hostedAllowed: false/.test(bundledFeeds), 'the extension feeds are not bundle-only');
});
for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
