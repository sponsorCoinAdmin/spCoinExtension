// File: test/styleBoundary.test.mjs
//
// docs/meritMigration.txt row 35 (owner, 2026-10-18): meritWalletStyles.ts (spcoin-common/src/styles) is the Merit Wallet's one standardized style file; Merit Wallet styling lives there, as plain values, and a component imports it.
// This check counts the styling LITERALS still written inside the package's src (a non-empty className string, style={{ ... }}, style: { ... }, a module-level CSSProperties object) per file and holds each file to its baseline: a file may not gain one (put the style in the
// style file), and when a file loses one the baseline must shrink with it (--update-baseline), so the count only goes down. Files that no longer appear have no baseline entry.
// Run: node test/styleBoundary.test.mjs [--update-baseline]
// MUTANT=newLiteral|baselineStale run against deliberately broken input and must report failures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, '..', 'src');
const BASELINE = path.join(HERE, 'styleBoundaryBaseline.json');
const m = process.env.MUTANT;
const LITERAL = /[A-Za-z]*[cC]lassName=(?:"[^"]|'[^']|\{`|\{['"])|className=\{[^{}]*\?\s*['"`][^'"`]|style=\{\{|style: \{|CSSProperties\s*=\s*\{|['"`]#[0-9a-fA-F]{3,8}['"`]/g;

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    return /\.(ts|tsx)$/.test(e.name) ? [p] : [];
  });
}
const rel = (p) => path.relative(SRC, p).split(path.sep).join('/');
const actual = {};
for (const file of walk(SRC)) {
  const text = fs.readFileSync(file, 'utf8');
  const n = (text.match(LITERAL) || []).length;
  if (n) actual[rel(file)] = n;
}
if (m === 'newLiteral') actual['config/WalletSessionDialogs.tsx'] = (actual['config/WalletSessionDialogs.tsx'] || 0) + 1;

if (process.argv.includes('--update-baseline')) {
  fs.writeFileSync(BASELINE, JSON.stringify(Object.fromEntries(Object.entries(actual).sort()), null, 2) + '\n');
  console.log(`styleBoundary: baseline rewritten: ${Object.keys(actual).length} files, ${Object.values(actual).reduce((a, b) => a + b, 0)} literals`);
  process.exit(0);
}
let baseline = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
if (m === 'baselineStale') baseline = { ...baseline, 'config/ConnectedWalletConfig.tsx': 3 };

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

await test('no file gains a styling literal: new styling goes into meritWalletStyles.ts (spcoin-common/src/styles)', () => {
  const grown = Object.entries(actual).filter(([f, n]) => n > (baseline[f] ?? 0)).map(([f, n]) => `${f} ${baseline[f] ?? 0} -> ${n}`);
  assert.deepEqual(grown, [], 'styling literals added outside the style file: ' + grown.join('; '));
});
await test('the baseline only shrinks: a file that lost literals lowers its entry (node test/styleBoundary.test.mjs --update-baseline)', () => {
  const stale = Object.entries(baseline).filter(([f, n]) => (actual[f] ?? 0) < n).map(([f, n]) => `${f} ${n} -> ${actual[f] ?? 0}`);
  assert.deepEqual(stale, [], 'stale baseline entries: ' + stale.join('; '));
});
await test('the screens this migration moved carry no styling literal of their own', () => {
  for (const f of ['config/WalletSessionDialogs.tsx', 'walletConfigPanelProps.tsx', 'sponsor/ConnectedSponsorPanel.tsx', 'PasswordPromptDialog.tsx', 'DeleteWalletDialog.tsx', 'RecoveryPhraseScreen.tsx', 'VaultAccountsPanel.tsx', 'WalletOnboardingPanel.tsx', 'ChangePasswordPanel.tsx', 'account/AddAccountFlow.tsx', 'ConnectedMessagePanel.tsx', 'MeritWallet.tsx', 'account/AccountDetailScreen.tsx', 'account/AccountPrivateKeyRow.tsx', 'account/form/AccountFormPanel.tsx', 'account/form/AccountAvatarPanel.tsx', 'account/form/DisconnectedControl.tsx', 'panels/NetworkDetailPanel.tsx', 'panels/TokenDetailPanel.tsx']) assert.equal(actual[f] ?? 0, 0, f);
});

await test('the whole package carries no styling literal (the migration is complete: the baseline is empty)', () => {
  assert.deepEqual(Object.keys(baseline), [], 'baseline entries left: ' + Object.keys(baseline).join(', '));
  assert.deepEqual(Object.entries(actual), [], 'styling literals left: ' + Object.keys(actual).join(', '));
});

let failed = 0;
for (const [status, name] of results) { console.log(status + ' ' + name); if (status === 'FAIL') failed++; }
const left = Object.values(actual).reduce((a, b) => a + b, 0);
console.log(`styleBoundary: ${left} styling literals remain in ${Object.keys(actual).length} files`);
process.exit(failed ? 1 : 0);
