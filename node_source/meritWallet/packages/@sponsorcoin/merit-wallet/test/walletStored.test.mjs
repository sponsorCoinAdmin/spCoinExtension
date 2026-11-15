// File: test/walletStored.test.mjs
//
// docs/meritMigration.txt row 22: parseMeritWalletStored / sanitizeWalletConfig are the ONE reader of the stored wallet config for the web app and the extension. This pins the migrations the web app had (legacy password modes, legacy sync flags, the 'disabled' mode), the limits, and the single set of defaults.
// Run: node test/walletStored.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ts = createRequire(import.meta.url)('typescript');
const src = fs.readFileSync(path.join(HERE, '..', 'src', 'walletConfig.ts'), 'utf8');
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
new Function('require', 'module', 'exports', js)((id) => ({ react: { useCallback: (f) => f, useEffect() {}, useRef: () => ({}), useState: (v) => [v, () => {}] } }[id] || {}), mod, mod.exports);
const { parseMeritWalletStored, sanitizeWalletConfig, DEFAULT_WALLET_CONFIG, persistedTimeoutMs, isIdleLockDue } = mod.exports;

const cfg = (config, extra = {}) => JSON.stringify({ active: true, config, ...extra });
const read = (config) => parseMeritWalletStored(cfg(config)).config;

// nothing saved, not JSON, not an object: the defaults, inactive
for (const text of [null, undefined, '', '{oops', '5', 'null']) assert.deepEqual(parseMeritWalletStored(text), { active: false, config: DEFAULT_WALLET_CONFIG }, String(text));
assert.equal(parseMeritWalletStored('{"active":true}').active, true);
assert.equal(parseMeritWalletStored('{"active":"true"}').active, false);
// a stored config that lacks a field takes the fresh-wallet default (before row 5 the web read a missing showBackgroundPage as false and modalMode as true)
assert.deepEqual(read({}), DEFAULT_WALLET_CONFIG);
assert.equal(read({}).showBackgroundPage, true);
assert.equal(read({}).modalMode, false);
// an explicit choice is kept
assert.equal(read({ showBackgroundPage: false }).showBackgroundPage, false);
assert.equal(read({ modalMode: true }).modalMode, true);
assert.equal(read({ mandatoryApproval: false }).mandatoryApproval, false);
assert.equal(read({ mandatoryApproval: null }).mandatoryApproval, true);
// password modes: current, the 'disabled' mode, the two renamed ones, anything else
for (const m of ['appRequired', 'firstApproved', 'methodRequired', 'disabled', 'persisted']) assert.equal(read({ passwordMode: m }).passwordMode, m);
assert.equal(read({ passwordMode: 'require' }).passwordMode, 'appRequired');
assert.equal(read({ passwordMode: 'skipGate' }).passwordMode, 'methodRequired');
for (const m of ['bogus', '', 7, null]) assert.equal(read({ passwordMode: m }).passwordMode, 'appRequired');
// sync: the current value wins; the two legacy flags; the default
assert.equal(read({ syncMode: 'authorize' }).syncMode, 'authorize');
assert.equal(read({ syncDisabled: true }).syncMode, 'disable');
assert.equal(read({ syncAuthorizationRequired: true }).syncMode, 'authorize');
assert.equal(read({ syncDisabled: true, syncAuthorizationRequired: true }).syncMode, 'disable');
assert.equal(read({ syncMode: 'enable', syncDisabled: true }).syncMode, 'enable');
assert.equal(read({ syncMode: 'x' }).syncMode, 'enable');
// whitelists and limits
assert.equal(read({ location: 'CENTER' }).location, 'CENTER');
assert.equal(read({ location: 'center' }).location, 'FIXED');
assert.equal(read({ extensionChannel: 'test' }).extensionChannel, 'test');
assert.equal(read({ extensionChannel: 'beta' }).extensionChannel, 'prod');
const hours = (h) => read({ persistedPasswordTimeoutHours: h }).persistedPasswordTimeoutHours;
assert.equal(hours(100), 24);
assert.equal(hours(0), 1 / 60);
assert.equal(hours(-3), 1 / 60);
assert.equal(hours(5), 5);
assert.equal(hours('abc'), 1);
assert.equal(hours(null), 1 / 60); // JSON turns Infinity and NaN into null, which reads as 0 hours: the 1 minute floor (the web app did the same)
assert.equal(sanitizeWalletConfig(undefined).persistedPasswordTimeoutHours, 1);
// the idle limit: the ORIGINAL inline formula of walletState.tsx (before row 24) against the shared one, over a sweep of values
const originalLimitMs = (hours) => Math.max(1, Math.min(24 * 60, Math.round((Number.isFinite(hours) ? hours : 1) * 60))) * 60_000;
const sweep = [0, 0.001, 1 / 120, 1 / 60, 0.0167, 0.02, 0.0833, 0.5, 1, 1.004, 1.5, 2.25, 5, 12.5, 23.99, 24, 24.01, 100, -1, NaN, Infinity, -Infinity];
for (let h = 0; h <= 25; h += 0.0137) sweep.push(h);
for (const h of sweep) assert.equal(persistedTimeoutMs(h), originalLimitMs(h), 'limit for ' + h);
assert.equal(persistedTimeoutMs(1), 3_600_000);
assert.equal(persistedTimeoutMs(1 / 60), 60_000);
assert.equal(isIdleLockDue(3_599_999, 1), false);
assert.equal(isIdleLockDue(3_600_000, 1), true);
assert.equal(isIdleLockDue(0, 1), false);
console.log('walletStored: the stored wallet config is read the same way by every host');
