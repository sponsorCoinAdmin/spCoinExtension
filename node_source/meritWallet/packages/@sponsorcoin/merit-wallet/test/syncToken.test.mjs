// File: test/syncToken.test.mjs
//
// docs/meritMigration.txt row 32: createSyncTokenProvider (src/sync/syncToken.ts) is the web app's ensureSyncToken policy, moved. ORACLE: the original file, kept verbatim as test/fixtures/ensureSyncToken.original.ts.txt, run through the same ten scenarios with a fake clock
// and fake timers. The new provider must leave EXACTLY the same trace: every signer request, every sign-in, every timer set or cleared, every token and every error. Recorded outputs: syncToken.golden.json (recorded from the ORIGINAL).
// Run: node test/syncToken.test.mjs [--record]
// MUTANT=noDedupe|noLead|noDisableClear|noRefreshClear|wrongExpiryPart|alwaysInteractive run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ts = createRequire(import.meta.url)('typescript');
const GOLDEN = path.join(HERE, 'syncToken.golden.json');
const m = process.env.MUTANT;
// a mutant can make a scenario loop for ever (timers that re-arm at the same instant): a hang is a FAILURE, never a stuck run
setTimeout(() => { console.log('FAIL (watchdog: the scenarios did not finish in 20 s)'); process.exit(1); }, 20000).unref();
const compile = (src) => ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;

let newSrc = fs.readFileSync(path.join(HERE, '..', 'src', 'sync', 'syncToken.ts'), 'utf8').split(String.fromCharCode(13)).join('');
if (m === 'noDedupe') newSrc = newSrc.replace('if (inFlight?.address === normalized) return inFlight.promise;', '');
if (m === 'noLead') newSrc = newSrc.replace('cached.expiresAt - now() > REFRESH_LEAD_MS', 'cached.expiresAt - now() > 0');
if (m === 'noDisableClear') newSrc = newSrc.replace("    if (host.isSyncDisabled()) {\n      clearScheduledRefresh();\n      cached = null;", "    if (host.isSyncDisabled()) {");
if (m === 'noRefreshClear') newSrc = newSrc.replace("function scheduleRefresh(params: EnsureSyncTokenParams, expiresAt: number) {\n    clearScheduledRefresh();", "function scheduleRefresh(params: EnsureSyncTokenParams, expiresAt: number) {");
if (m === 'wrongExpiryPart') newSrc = newSrc.replace('Number.parseInt(parts[1], 36)', 'Number.parseInt(parts[2], 36)');
if (m === 'alwaysInteractive') newSrc = newSrc.replace('interactive: params.userInitiated === true,', 'interactive: true,');

// ---- the fakes: a clock, timers, and the host's signer, sign-in and settings; every call lands in the trace ----
function makeWorld() {
  const trace = [];
  const clock = { now: 1_000_000 };
  const timers = []; let nextId = 1;
  const world = {
    trace, clock,
    settings: { disabled: false, authRequired: false },
    nextToken: null, failSignIn: false, signInDelay: 0,
    token: (offsetMs) => `v1.${(clock.now + offsetMs).toString(36)}.sig.x`,
    fakeSetTimeout: (fn, ms) => { const id = nextId++; timers.push({ id, at: clock.now + ms, fn, live: true }); trace.push(['timer set', ms]); return id; },
    fakeClearTimeout: (id) => { const t = timers.find((x) => x.id === id); if (t && t.live) { t.live = false; trace.push(['timer cleared']); } },
    async advance(ms) {
      const target = clock.now + ms;
      for (;;) {
        const due = timers.filter((t) => t.live && t.at <= target).sort((a, b) => a.at - b.at)[0];
        if (!due) break;
        clock.now = due.at; due.live = false; due.fn();
        for (let i = 0; i < 20; i += 1) await Promise.resolve();
        await new Promise((r) => setImmediate(r));
      }
      clock.now = target;
    },
    host: null,
  };
  world.host = {
    getSigner: async (request) => { trace.push(['signer request', request]); return { signMessage: async (message) => { trace.push(['sign', message]); return 'signature'; } }; },
    signInForSync: async (address, sign) => {
      trace.push(['signIn', address]);
      await sign('challenge');
      if (world.signInDelay) await new Promise((r) => setTimeout(r, world.signInDelay));
      if (world.failSignIn) throw new Error('sign-in failed');
      const t = world.nextToken ?? world.token(300_000);
      trace.push(['token minted', t.split('.')[0] + '.' + (Number.parseInt(t.split('.')[1], 36) - clock.now) + '.']);
      return t;
    },
    isSyncDisabled: () => world.settings.disabled,
    isSyncAuthorizationRequired: () => world.settings.authRequired,
  };
  return world;
}

// ---- the two implementations behind one shape ----
function loadNew(world) {
  const mod = { exports: {} };
  new Function('module', 'exports', 'setTimeout', 'clearTimeout', 'Date', compile(newSrc))(mod, mod.exports, world.fakeSetTimeout, world.fakeClearTimeout, { now: () => world.clock.now });
  const provider = mod.exports.createSyncTokenProvider(world.host);
  return { ensure: (p) => provider.ensureSyncToken(p), reset: () => provider.reset() };
}
function loadOracle(world) {
  const src = fs.readFileSync(path.join(HERE, 'fixtures', 'ensureSyncToken.original.ts.txt'), 'utf8').split(String.fromCharCode(13)).join('');
  const mod = { exports: {} };
  const stubs = {
    '@/lib/spCoin/getConnectedSigner': { getConnectedSigner: world.host.getSigner },
    '@/components/wallet/lib/meritConnect': { isSyncAuthorizationRequired: world.host.isSyncAuthorizationRequired, isSyncDisabled: world.host.isSyncDisabled },
    './exchangeContextClient': { signInForSync: world.host.signInForSync },
  };
  new Function('require', 'module', 'exports', 'setTimeout', 'clearTimeout', 'Date', compile(src))((id) => stubs[id] ?? {}, mod, mod.exports, world.fakeSetTimeout, world.fakeClearTimeout, { now: () => world.clock.now });
  return { ensure: (p) => mod.exports.ensureSyncToken(p), reset: () => mod.exports._resetSyncTokenCacheForTests() };
}

const P = (over = {}) => ({ chainId: 31337, activeAccountAddress: '0xAbC0000000000000000000000000000000000001', rpcUrl: 'http://rpc', ...over });
const attempt = async (world, label, fn) => { try { const v = await fn(); world.trace.push([label, 'ok', typeof v === 'string' ? v.split('.')[0] + '.' + (Number.parseInt(v.split('.')[1] ?? '0', 36) - world.clock.now) + '.' : v]); } catch (e) { world.trace.push([label, 'error', String(e.message)]); } };

const SCENARIOS = {
  'sync disabled: asking fails and nothing is minted': async (w, api) => { w.settings.disabled = true; await attempt(w, 'ensure', () => api.ensure(P())); },
  'first call mints, the second is served from the cache': async (w, api) => { await attempt(w, 'ensure 1', () => api.ensure(P())); await attempt(w, 'ensure 2', () => api.ensure(P())); },
  'authorization required and user initiated change the signer request': async (w, api) => { w.settings.authRequired = true; await attempt(w, 'ensure', () => api.ensure(P({ userInitiated: true }))); api.reset(); w.settings.authRequired = false; await attempt(w, 'ensure b', () => api.ensure(P({ userInitiated: true }))); api.reset(); await attempt(w, 'ensure c', () => api.ensure(P())); },
  'two concurrent callers share one mint (even with a different address case)': async (w, api) => { w.signInDelay = 5; const a = attempt(w, 'a', () => api.ensure(P())); const b = attempt(w, 'b', () => api.ensure(P({ activeAccountAddress: '0xabc0000000000000000000000000000000000001' }))); await Promise.all([a, b]); },
  'another account mints its own token': async (w, api) => { await attempt(w, 'first', () => api.ensure(P())); await attempt(w, 'other', () => api.ensure(P({ activeAccountAddress: '0xDef0000000000000000000000000000000000002' }))); await attempt(w, 'first again', () => api.ensure(P())); },
  'a token with less than 90 s left is replaced': async (w, api) => { w.nextToken = w.token(120_000); await attempt(w, 'ensure 1', () => api.ensure(P())); await w.advance(20_000); w.nextToken = null; await attempt(w, 'ensure 2 (100 s left)', () => api.ensure(P())); await w.advance(20_000); await attempt(w, 'ensure 3', () => api.ensure(P())); },
  'the scheduled refresh mints again, schedules again, and a failed refresh forgets the token': async (w, api) => { await attempt(w, 'ensure', () => api.ensure(P())); await w.advance(210_000); w.failSignIn = true; await w.advance(210_000); w.failSignIn = false; await attempt(w, 'ensure after failed refresh', () => api.ensure(P())); },
  'a token that is not a token is refused and not kept': async (w, api) => { w.nextToken = 'garbage'; await attempt(w, 'ensure bad', () => api.ensure(P())); w.nextToken = 'a.b.c'; await attempt(w, 'ensure three parts', () => api.ensure(P())); w.nextToken = 'v1.0.sig.x'; await attempt(w, 'ensure zero expiry', () => api.ensure(P())); w.nextToken = null; await attempt(w, 'ensure good', () => api.ensure(P())); },
  'a token that is already inside the 90 s window is never served from the cache': async (w, api) => { w.nextToken = w.token(60_000); await attempt(w, 'ensure 1', () => api.ensure(P())); w.nextToken = w.token(60_000); await attempt(w, 'ensure 2 (nothing has elapsed, 60 s left)', () => api.ensure(P())); },
  'turning sync off drops the token and cancels its refresh': async (w, api) => { await attempt(w, 'ensure', () => api.ensure(P())); w.settings.disabled = true; await attempt(w, 'ensure disabled', () => api.ensure(P())); await w.advance(400_000); w.settings.disabled = false; await attempt(w, 'ensure re-enabled', () => api.ensure(P())); },
};

async function runAll(load) {
  const out = {};
  for (const [name, scenario] of Object.entries(SCENARIOS)) {
    const world = makeWorld();
    const api = load(world);
    await scenario(world, api);
    out[name] = JSON.parse(JSON.stringify(world.trace));
    api.reset();
  }
  return out;
}

if (process.argv.includes('--record')) {
  const rec = await runAll(loadOracle);
  fs.writeFileSync(GOLDEN, JSON.stringify(rec, null, 2) + '\n');
  console.log('syncToken: recorded ' + Object.keys(rec).length + ' scenarios from the original (' + Object.values(rec).reduce((n, t) => n + t.length, 0) + ' trace steps)');
  process.exit(0);
}
const want = JSON.parse(fs.readFileSync(GOLDEN, 'utf8'));
const got = await runAll(loadNew);
let failed = 0;
for (const name of Object.keys(want)) {
  const same = JSON.stringify(want[name]) === JSON.stringify(got[name]);
  console.log((same ? 'PASS ' : 'FAIL ') + name);
  if (!same) { failed += 1; console.log('   recorded ' + JSON.stringify(want[name]).slice(0, 400)); console.log('   now      ' + JSON.stringify(got[name]).slice(0, 400)); }
}
console.log(failed ? `\n${failed} FAILED` : `\nall ${Object.keys(want).length} scenarios leave the recorded trace`);
process.exit(failed ? 1 : 0);
