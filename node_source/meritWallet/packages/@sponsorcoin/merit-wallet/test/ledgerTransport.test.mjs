// File: test/ledgerTransport.test.mjs
//
// docs/design/accountAuthDesign.txt section 17 item 12 / docs/design/accountAuthDesign.txt row 16: the LEDGER transport over WebHID (src/auth/ledgerTransport.ts) driven by a SIMULATED Ledger that signs with known test keys. Nothing here needs a device, and nothing proves the real device works:
// what is checked is everything this file does around the device: the Ledger Live paths it asks for, the signature it assembles from the device's r / s / v (compared with viem's own signature of the same message with the same key), the nonce / gas / fees it fills in and the
// signed raw transaction it returns (parsed and its sender recovered), the legacy and the EIP-1559 forms, one request at a time, the device's status words mapped to the hardware error set, and the libraries loaded only when a device is opened. Run: node test/ledgerTransport.test.mjs
// MUTANT=pathWrong|noSerial|vNotLifted|noGasMargin|rejectedAsLocked|alwaysTyped|loadEager|unknownAddressSigns run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const ts = req('typescript');
const viem = req('viem');
const { privateKeyToAccount } = req('viem/accounts');
const SRC = path.join(HERE, '..', 'src');
const m = process.env.MUTANT;
const NL = String.fromCharCode(10);
const cache = new Map();
function load(rel) {
  const file = path.join(SRC, rel + '.ts');
  if (cache.has(file)) return cache.get(file).exports;
  let src = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const mutate = (from, to) => { assert.ok(src.includes(from), 'mutant anchor missing: ' + from); src = src.replace(from, to); };
  if (rel === 'auth/hardwareShared') {
    if (m === 'pathWrong') mutate("`44'/60'/${index}'/0/0`", "`44'/60'/0'/0/${index}`");
    if (m === 'noSerial') mutate('const next = queue.then(run, run);', 'const next = run();');
    if (m === 'vNotLifted') mutate('const recovery = vNumber < 27 ? vNumber + 27 : vNumber;', 'const recovery = vNumber;');
    if (m === 'noGasMargin') mutate('(BigInt(String(gasHex)) * 12n) / 10n', 'BigInt(String(gasHex))');
    if (m === 'alwaysTyped') mutate('if (base) {', 'if (true) {');
  }
  if (rel === 'auth/ledgerTransport') {
    if (m === 'rejectedAsLocked') mutate("return new HardwareError('rejected', 'You declined it on the Ledger.');", "return new HardwareError('locked', 'You declined it on the Ledger.');");
    if (m === 'loadEager') mutate('  return {' + NL + "    kind: 'ledger',", "  void options.loadTransport();" + NL + "  return {" + NL + "    kind: 'ledger',");
    if (m === 'unknownAddressSigns') mutate("if (!row) throw new HardwareError('unsupported', `${address} is not one of the accounts read from this Ledger.`);" + NL + '    return row.path;', 'return row ? row.path : ledgerLivePath(0);');
  }
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  cache.set(file, mod);
  new Function('require', 'module', 'exports', js)((id) => (id.startsWith('.') ? load(path.relative(SRC, path.resolve(path.dirname(file), id)).replace(/\\/g, '/')) : req(id)), mod, mod.exports);
  return mod.exports;
}
const { createLedgerTransport, ledgerLivePath, translateLedgerError } = load('auth/ledgerTransport');
const { createHardwareAuthenticator, HardwareError } = load('auth/hardwareAuthenticator');
const { AuthenticatorError } = load('auth/authenticator');

// the public Hardhat test keys (accounts 0 to 4), one per Ledger Live path index
const KEYS = [
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
  '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
  '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6',
  '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a',
];
const accountAt = (i) => privateKeyToAccount(KEYS[i]);
const pathToIndex = (p) => Number(/^44'\/60'\/(\d+)'\/0\/0$/.exec(p)?.[1]);
const strip = (h) => (h.startsWith('0x') ? h.slice(2) : h);

/** A simulated Ledger: the device class and the Ethereum app class the transport loads, signing with the test keys. */
function simulatedLedger(over = {}) {
  const calls = { paths: [], concurrent: 0, maxConcurrent: 0, loaded: 0, closed: 0, opened: 0 };
  const listeners = {};
  const device = { close: async () => { calls.closed += 1; }, on: (event, l) => { listeners[event] = l; } };
  class Eth {
    async track(fn) {
      calls.concurrent += 1;
      calls.maxConcurrent = Math.max(calls.maxConcurrent, calls.concurrent);
      await new Promise((r) => setTimeout(r, 15));
      try { return await fn(); } finally { calls.concurrent -= 1; }
    }
    async getAddress(p) { calls.paths.push(p); if (over.getAddress) return over.getAddress(p); return this.track(async () => ({ address: accountAt(pathToIndex(p)).address })); }
    async signPersonalMessage(p, hex) {
      if (over.sign) throw over.sign;
      return this.track(async () => {
        const sig = await accountAt(pathToIndex(p)).signMessage({ message: { raw: `0x${hex}` } });
        const v = parseInt(strip(sig).slice(128), 16);
        return { r: strip(sig).slice(0, 64), s: strip(sig).slice(64, 128), v: over.parityV ? v - 27 : v }; // some device versions answer the parity (0 / 1), others 27 / 28
      });
    }
    async signTransaction(p, rawHex) {
      if (over.sign) throw over.sign;
      return this.track(async () => {
        const unsigned = viem.parseTransaction(`0x${rawHex}`);
        const signedRaw = await accountAt(pathToIndex(p)).signTransaction(unsigned);
        const parsed = viem.parseTransaction(signedRaw);
        // the device answers v as hex: the parity for a typed transaction, the EIP-155 v for a legacy one
        const v = unsigned.type === 'legacy' || unsigned.type === undefined ? parsed.v : BigInt(parsed.yParity ?? 0);
        return { r: strip(parsed.r), s: strip(parsed.s), v: v.toString(16).padStart(2, '0') };
      });
    }
  }
  const Transport = {
    isSupported: async () => true,
    create: async () => { calls.opened += 1; if (over.create) throw over.create; return device; },
    openConnected: async () => (over.granted ? device : null),
  };
  return {
    calls,
    device,
    fire: (event) => listeners[event]?.(),
    options: (extra = {}) => ({
      loadTransport: async () => { calls.loaded += 1; return { default: Transport }; },
      loadEthApp: async () => ({ default: Eth }),
      rpc: async (chainId, method) => {
        switch (method) {
          case 'eth_getTransactionCount': return '0x7';
          case 'eth_estimateGas': return '0x5208';
          case 'eth_getBlockByNumber': return over.legacyChain ? { number: '0x1' } : { baseFeePerGas: '0x3b9aca00' };
          case 'eth_maxPriorityFeePerGas': return '0x59682f00';
          case 'eth_gasPrice': return '0x77359400';
          default: throw new Error('no ' + method);
        }
      },
      isSupported: () => true,
      ...extra,
    }),
  };
}

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };
const fresh = (over) => { const sim = simulatedLedger(over); return { sim, transport: createLedgerTransport(sim.options()) }; };

await test('the libraries are loaded only when a device is opened (a host that never offers a Ledger never loads them)', async () => {
  const { sim, transport } = fresh();
  assert.equal(sim.calls.loaded, 0);
  assert.equal(transport.isConnected(), false);
  await transport.connect();
  assert.equal(sim.calls.loaded, 1);
});

await test('connect reads the first five accounts of the Ledger Live path m/44\'/60\'/i\'/0/0, with the right addresses and names', async () => {
  const { sim, transport } = fresh();
  const rows = await transport.connect();
  assert.deepEqual(sim.calls.paths, [0, 1, 2, 3, 4].map((i) => `44'/60'/${i}'/0/0`));
  assert.deepEqual(rows.map((r) => r.address), KEYS.map((k, i) => accountAt(i).address));
  assert.equal(rows[0].name, 'Ledger Account 1');
  assert.equal(transport.isConnected(), true);
  assert.equal(ledgerLivePath(3), "44'/60'/3'/0/0");
});

await test('a personal message is signed through the device and the signature equals viem\'s own for the same key and message (v lifted to 27 / 28)', async () => {
  const { transport } = fresh();
  await transport.connect();
  for (const [i, text] of [[0, 'Sign in to SponsorCoin'], [2, 'tést ✓ unicode message']]) {
    const got = await transport.signMessage(accountAt(i).address, text);
    assert.equal(got, await accountAt(i).signMessage({ message: text }));
    assert.match(got, /^0x[0-9a-f]{130}$/);
  }
});

await test('a device that answers the parity (0 / 1) instead of 27 / 28 gives the same signature', async () => {
  const transport = createLedgerTransport(simulatedLedger({ parityV: true }).options());
  await transport.connect();
  const got = await transport.signMessage(accountAt(1).address, 'parity check');
  assert.equal(got, await accountAt(1).signMessage({ message: 'parity check' }));
});

await test('an EIP-1559 transaction is filled in (nonce, gas with a margin, fees), signed by the device, and the raw transaction recovers to the account', async () => {
  const { transport } = fresh();
  await transport.connect();
  const from = accountAt(1).address;
  const raw = await transport.signTransaction({ from, to: '0x000000000000000000000000000000000000dEaD', value: 12345n, chainId: 31337 });
  const tx = viem.parseTransaction(raw);
  assert.equal(tx.type, 'eip1559');
  assert.equal(tx.chainId, 31337);
  assert.equal(tx.nonce, 7);
  assert.equal(tx.gas, 25200n, '21000 estimated, plus 20%');
  assert.equal(tx.maxPriorityFeePerGas, 0x59682f00n);
  assert.equal(tx.maxFeePerGas, 0x3b9aca00n * 2n + 0x59682f00n);
  assert.equal(tx.value, 12345n);
  const { recoverTransactionAddress } = viem;
  assert.equal(await recoverTransactionAddress({ serializedTransaction: raw }), from);
});

await test('on a chain with no base fee the transaction is a LEGACY one (EIP-155), and it recovers to the account too', async () => {
  const sim = simulatedLedger({ legacyChain: true });
  const transport = createLedgerTransport(sim.options());
  await transport.connect();
  const from = accountAt(0).address;
  const raw = await transport.signTransaction({ from, to: '0x000000000000000000000000000000000000dEaD', data: '0x', chainId: 56 });
  const tx = viem.parseTransaction(raw);
  assert.equal(tx.type, 'legacy');
  assert.equal(tx.chainId, 56);
  assert.equal(tx.gasPrice, 0x77359400n);
  const { recoverTransactionAddress } = viem;
  assert.equal(await recoverTransactionAddress({ serializedTransaction: raw }), from);
});

await test('the device\'s status words become the hardware error set: declined, locked, Ethereum app closed, blind signing off', async () => {
  for (const [statusCode, code] of [[0x6985, 'rejected'], [0x6982, 'locked'], [0x6d00, 'app_closed'], [0x6e00, 'app_closed'], [0x6a80, 'unsupported']]) {
    const sim = simulatedLedger({ sign: Object.assign(new Error('status ' + statusCode.toString(16)), { statusCode }) });
    const transport = createLedgerTransport(sim.options());
    await transport.connect();
    await assert.rejects(transport.signMessage(accountAt(0).address, 'x'), (e) => e instanceof HardwareError && e.code === code, 'status 0x' + statusCode.toString(16));
  }
});

await test('opening: cancelling the browser\'s device chooser, a device in use elsewhere, and an unplug are each a plain message, and a failed open leaves nothing connected', async () => {
  const cancelled = createLedgerTransport(simulatedLedger({ create: Object.assign(new Error('No device selected.'), { name: 'NotFoundError' }) }).options());
  await assert.rejects(cancelled.connect(), (e) => e.code === 'unavailable' && /No Ledger was selected/.test(e.message));
  const busy = createLedgerTransport(simulatedLedger({ create: Object.assign(new Error('The device is already open.'), { name: 'TransportInterfaceNotAvailable' }) }).options());
  await assert.rejects(busy.connect(), (e) => e.code === 'unavailable' && /in use/.test(e.message));
  assert.equal(busy.isConnected(), false);
  assert.equal(translateLedgerError(Object.assign(new Error('x'), { name: 'DisconnectedDevice' })).code, 'not_connected');
  const appClosed = simulatedLedger({ getAddress: async () => { throw Object.assign(new Error('x'), { statusCode: 0x6e00 }); } });
  const t = createLedgerTransport(appClosed.options());
  await assert.rejects(t.connect(), (e) => e.code === 'app_closed');
  assert.equal(t.isConnected(), false);
  assert.equal(appClosed.calls.closed, 1, 'the device is closed again when the app is not open');
});

await test('an address the Ledger did not give is refused (never signed with another path)', async () => {
  const { transport } = fresh();
  await transport.connect();
  await assert.rejects(transport.signMessage('0x1111111111111111111111111111111111111111', 'x'), (e) => e.code === 'unsupported');
});

await test('a Ledger answers one request at a time: concurrent signs are queued, never overlapped', async () => {
  const { sim, transport } = fresh();
  await transport.connect();
  const a = accountAt(0).address;
  await Promise.all([transport.signMessage(a, 'one'), transport.signMessage(a, 'two'), transport.signMessage(a, 'three')]);
  assert.equal(sim.calls.maxConcurrent, 1);
});

await test('unplugging announces a change and forgets the accounts; disconnect closes the device; restore reopens a granted device without a prompt and returns [] when there is none', async () => {
  const { sim, transport } = fresh();
  let changes = 0;
  transport.onChange(() => { changes += 1; });
  await transport.connect();
  const before = changes;
  sim.fire('disconnect');
  assert.equal(transport.isConnected(), false);
  assert.deepEqual(transport.accounts(), []);
  assert.ok(changes > before);
  await transport.connect();
  await transport.disconnect();
  assert.equal(transport.isConnected(), false);
  assert.ok(sim.calls.closed >= 1);
  assert.deepEqual(await createLedgerTransport(simulatedLedger().options()).restore(), []);
  const granted = simulatedLedger({ granted: true });
  const restored = createLedgerTransport(granted.options());
  assert.equal((await restored.restore()).length, 5);
  assert.equal(granted.calls.opened, 0, 'no chooser (create) was used');
});

await test('through the hardware authenticator: connect lists the accounts, a send signs on the device and broadcasts the raw transaction, a decline is user_rejected', async () => {
  const sim = simulatedLedger();
  const transport = createLedgerTransport(sim.options());
  let broadcast;
  const auth = createHardwareAuthenticator(transport, { broadcast: async (raw, chainId) => { broadcast = { raw, chainId }; return '0xhash'; } });
  assert.equal(auth.id, 'hardware:ledger');
  const accounts = await auth.connect();
  assert.equal(accounts.length, 5);
  const from = accounts[0].address;
  const sent = await auth.sendTransaction({ from, to: '0x000000000000000000000000000000000000dEaD', value: 1n, chainId: 31337 });
  assert.equal(sent.hash, '0xhash');
  assert.equal(broadcast.chainId, 31337);
  assert.equal(viem.parseTransaction(broadcast.raw).value, 1n);
  const declining = createHardwareAuthenticator(createLedgerTransport(simulatedLedger({ sign: Object.assign(new Error('no'), { statusCode: 0x6985 }) }).options()), { broadcast: async () => '0x' });
  const list = await declining.connect();
  await assert.rejects(declining.signMessage(list[0].address, 'x'), (e) => e instanceof AuthenticatorError && e.code === 'user_rejected');
});

let failed = 0;
for (const [status, text] of results) { console.log(status + ' ' + text); if (status === 'FAIL') failed += 1; }
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
