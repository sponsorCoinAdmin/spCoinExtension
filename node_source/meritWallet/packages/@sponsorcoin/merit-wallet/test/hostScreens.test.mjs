// File: test/hostScreens.test.mjs
//
// docs/meritMigration.txt rows 27 / 28 (2026-10-19): a host passes data and functions, it never draws a wallet screen. First-run setup is `onboarding` (data and functions, in the HostLock section of the host contract); the component draws the setup screen INSTEAD of the wallet.
// The switch lives in the exported component, which has no hooks, so turning setup on and off never changes a hook count: the wired wallet is a separate component that remounts when setup ends.
// Run: node test/hostScreens.test.mjs
// MUTANT=noSwitch|switchInsideWired|noPlatform|notInContract|nodeProp run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, '..', 'src');
const m = process.env.MUTANT;
const read = (f) => fs.readFileSync(path.join(SRC, f), 'utf8').replace(/\r\n/g, '\n');
const swap = (text, from, to) => { assert.ok(text.includes(from), 'mutant anchor missing: ' + from); return text.replace(from, to); };

let wallet = read('MeritWallet.tsx');
let contract = read('hostContract.ts');
if (m === 'noSwitch') wallet = swap(wallet, 'if (props.onboarding) {', 'if (false) {');
if (m === 'switchInsideWired') wallet = swap(wallet, 'function MeritWalletWired(props: MeritWalletProps) {\n', 'function MeritWalletWired(props: MeritWalletProps) {\n  if (props.onboarding) return null;\n');
if (m === 'noPlatform') wallet = swap(wallet, 'React.createElement(MeritPlatformContext.Provider, { value: props.platform ?? domPlatform }, React.createElement(SetupScreen, props.onboarding))', 'React.createElement(SetupScreen, props.onboarding)');
if (m === 'notInContract') contract = swap(contract, "'walletLocked' | 'onboarding' | ", "'walletLocked' | ");
if (m === 'nodeProp') wallet = swap(wallet, '  onboarding?: WalletOnboardingPanelProps;', '  onboarding?: React.ReactNode;');

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

await test('onboarding is data and functions (the setup panel\'s own props), never a React node, and is filed under the lock section of the host contract', () => {
  assert.match(wallet, /onboarding\?: WalletOnboardingPanelProps;/);
  assert.match(contract, /'walletLocked' \| 'onboarding' \| /);
});
await test('the exported component shows the setup screen instead of the wallet, inside the platform context', () => {
  const body = wallet.slice(wallet.lastIndexOf('export default function MeritWallet(props: MeritWalletProps) {'));
  assert.match(body, /if \(props\.onboarding\) \{\n\s+return React\.createElement\(MeritPlatformContext\.Provider, \{ value: props\.platform \?\? domPlatform \}, React\.createElement\(SetupScreen, props\.onboarding\)\);\n\s+\}\n\s+return React\.createElement\(MeritWalletWired, props\);/);
});
await test('the switch has no hooks (so turning setup on and off cannot change a hook count), and the wired wallet does not handle setup itself', () => {
  const body = wallet.slice(wallet.lastIndexOf('export default function MeritWallet(props: MeritWalletProps) {'));
  assert.doesNotMatch(body, /React\.use[A-Z]|\buse[A-Z][A-Za-z]+\(/);
  const wired = wallet.slice(wallet.indexOf('function MeritWalletWired(props: MeritWalletProps) {'), wallet.indexOf('function MeritWalletWired(props: MeritWalletProps) {') + 200);
  assert.doesNotMatch(wired, /props\.onboarding/);
});

let failed = 0;
for (const [status, name] of results) { console.log(status + ' ' + name); if (status === 'FAIL') failed++; }
process.exit(failed ? 1 : 0);
