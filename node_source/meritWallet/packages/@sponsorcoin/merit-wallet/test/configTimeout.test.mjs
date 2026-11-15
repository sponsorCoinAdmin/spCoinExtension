// File: test/configTimeout.test.mjs
//
// docs/meritMigration.txt row 18: the Config tab's Time Limit picker is DRAWN BY THE COMPONENT from data (the persisted-password hours) and an action (what a change does); a host passes no React node for it.
// Run: node test/configTimeout.test.mjs
// MUTANT=nodeSlotBack|noPickerComponent|hoursNotClamped run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, '..', 'src');
const m = process.env.MUTANT;
const read = (...p) => fs.readFileSync(path.join(SRC, ...p), 'utf8').replace(/\r\n/g, '\n');
const swap = (text, from, to) => { assert.ok(text.includes(from), 'mutant anchor missing: ' + from); return text.replace(from, to); };
let wallet = read('MeritWallet.tsx');
let props = read('walletConfigPanelProps.tsx');
let contract = read('hostContract.ts');
if (m === 'nodeSlotBack') wallet = swap(wallet, '  configPersistedTimeoutHours?: number;', '  configPersistedTimeoutHours?: number;\n  configPersistedTimeoutContent?: React.ReactNode;');
if (m === 'noPickerComponent') wallet = swap(wallet, 'React.createElement(PersistedTimeoutPicker,', 'React.createElement("div",');
if (m === 'hoursNotClamped') props = swap(props, 'return clampPersistedPasswordTimeoutHours(raw);', 'return raw;');

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

await test('the host contract carries the hours and the change action, and no React node for the Time Limit', () => {
  assert.match(wallet, /configPersistedTimeoutHours\?: number;\n\s*onConfigPersistedTimeoutHoursChange\?: \(hours: number\) => void;/);
  assert.doesNotMatch(wallet, /configPersistedTimeoutContent\?: React\.ReactNode;/);
  assert.match(contract, /'configPersistedTimeoutHours' \| 'onConfigPersistedTimeoutHoursChange'/);
  assert.doesNotMatch(contract, /configPersistedTimeoutContent/);
});
await test('the component draws the picker from those two props, and only when both are given', () => {
  assert.match(wallet, /persistedTimeoutContent: configPersistedTimeoutHours !== undefined && onConfigPersistedTimeoutHoursChange \? React\.createElement\(PersistedTimeoutPicker, \{ hours: configPersistedTimeoutHours, onChange: onConfigPersistedTimeoutHoursChange \}\) : undefined,/);
});
await test('the picker is the package\'s component and the limit stays between one minute and 24 hours', () => {
  assert.match(props, /export function PersistedTimeoutPicker\(\{ hours, onChange \}/);
  assert.match(props, /return clampPersistedPasswordTimeoutHours\(raw\);/); // the clamp itself is the one in walletConfig.ts (row 21), pinned by walletConfigPanelProps.test.mjs
});

let failed = 0;
for (const [status, name] of results) { console.log(status + ' ' + name); if (status === 'FAIL') failed++; }
process.exit(failed ? 1 : 0);
