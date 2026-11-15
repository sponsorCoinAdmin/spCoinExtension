// File: test/trezorTransport.test.mjs
//
// docs/design/accountAuthDesign.txt section 17 item 12 (Trezor beside Ledger): the TREZOR transport (src/auth/trezorTransport.ts, over Trezor Connect) driven by a SIMULATED Trezor Connect that signs with known test keys. Nothing here needs a device, and nothing proves a real one works: what is checked is
// everything this file does around the device: the standard Ethereum path it asks for, the message signature it assembles (equal to viem's own for the same key), the transaction it hands the device (hex fields, EIP-1559 or legacy) and the signed raw transaction it returns (parsed, its sender
// recovered), the device's error codes mapped to the hardware error set, one request at a time, the library loaded and initialised only when a device is first used, and the pieces it shares with the Ledger transport. Run: node test/trezorTransport.test.mjs
// MUTANT=pathWrong|noInit|cancelAsLocked|connectCancelAsRejected|wrongTxFields|noSerial|loadEager|unknownAddressSigns run against deliberately broken copies and must report failures.
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
    if (m === 'pathWrong') mutate("`44'/60'/0'/0/${index}`", "`44'/60'/${index}'/0/0`");
    if (m === 'noSerial') mutate('const next = queue.then(run, run);', 'const next = run();');
  }
  if (rel === 'auth/trezorTransport') {
    if (m === 'noInit') mutate('await api.init({ manifest: options.manifest, lazyLoad: true, popup: true });', '');
    if (m === 'cancelAsLocked') mutate("new HardwareError('rejected', 'You declined it on the Trezor.')", "new HardwareError('locked', 'You declined it on the Trezor.')");
    if (m === 'connectCancelAsRejected') mutate("during === 'connect' ? new HardwareError('unavailable', 'The Trezor connection was cancelled.') :", 'false ? 0 as never :');
    if (m === 'wrongTxFields') mutate('nonce: hexQuantity(BigInt(unsigned.nonce ?? 0)),', 'nonce: hexQuantity(1n),');
    if (m === 'loadEager') mutate("  return {" + NL + "    kind: 'trezor',", "  void options.loadConnect();" + NL + "  return {" + NL + "    kind: 'trezor',");
    if (m === 'unknownAddressSigns') mutate("if (!row) throw new HardwareError('unsupported', `${address} is not one of the accounts read from this Trezor.`);" + NL + '    return row.path;', 'return row ? row.path : ethereumBip44Path(0);');
  }
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  cache.set(file, mod);
  new Function('require', 'module', 'exports', js)((id) => (id.startsWith('.') ? load(path.relative(SRC, path.resolve(path.dirname(file), id)).replace(/\\/g, '/')) : req(id)), mod, mod.exports);
  return mod.exports;
}
const { createTrezorTransport, translateTrezorError } = load('auth/trezorTransport');
const { createHardwareAuthenticator, HardwareError } = load('auth/hardwareAuthenticator');
const { AuthenticatorError } = load('auth/authenticator');

const KEYS = [
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
  '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
  '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6',
  '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a',
];
const accountAt = (i) => privateKeyToAccount(KEYS[i]);
const indexOf = (p) => Number(/^m\/44'\/60'\/0'\/0\/(\d+)$/.exec(p)?.[1]);
const strip = (h) => (h.startsWith('0x') ? h.slice(2) : h);

/** A simulated Trezor Connect: records what it is asked and signs with the test keys. */
function simulatedTrezor(over = {}) {
  const calls = { loaded: 0, inits: 0, getAddress: [], signMessage: [], signTransaction: [], concurrent: 0, maxConcurrent: 0 };
  const track = async (fn) => {
    calls.concurrent += 1;
    calls.maxConcurrent = Math.max(calls.maxConcurrent, calls.concurrent);
    await new Promise((r) => setTimeout(r, 15));
    try { return await fn(); } finally { calls.concurrent -= 1; }
  };
  const fail = (code, error) => ({ success: false, payload: { code, error } });
  const api = {
    init: async () => { calls.inits += 1; },
    ethereumGetAddress: async (params) => {
      calls.getAddress.push(params);
      if (over.getAddress) return over.getAddress;
      return { success: true, payload: params.bundle.map((b) => ({ address: accountAt(indexOf(b.path)).address, serializedPath: b.path })) };
    },
    ethereumSignMessage: async (params) => {
      calls.signMessage.push(params);
      if (over.sign) return over.sign;
      return track(async () => {
        const sig = await accountAt(indexOf(params.path)).signMessage({ message: params.message });
        return { success: true, payload: { address: accountAt(indexOf(params.path)).address, signature: strip(sig) } }; // Trezor answers without 0x
      });
    },
    ethereumSignTransaction: async (params) => {
      calls.signTransaction.push(params);
      if (over.sign) return over.sign;
      return track(async () => {
        const t = params.transaction;
        const base = { chainId: t.chainId, nonce: Number(BigInt(t.nonce)), gas: BigInt(t.gasLimit), to: t.to ?? undefined, value: BigInt(t.value), data: t.data };
        const unsigned = t.maxFeePerGas ? { type: 'eip1559', ...base, maxFeePerGas: BigInt(t.maxFeePerGas), maxPriorityFeePerGas: BigInt(t.maxPriorityFeePerGas) } : { type: 'legacy', ...base, gasPrice: BigInt(t.gasPrice) };
        const signedRaw = await accountAt(indexOf(params.path)).signTransaction(unsigned);
        const parsed = viem.parseTransaction(signedRaw);
        const v = t.maxFeePerGas ? BigInt(parsed.yParity ?? 0) : parsed.v;
        return { success: true, payload: { v: `0x${v.toString(16)}`, r: parsed.r, s: parsed.s } };
      });
    },
  };
  return {
    calls,
    fail,
    options: (extra = {}) => ({
      loadConnect: async () => { calls.loaded += 1; return { default: api }; },
      manifest: { appName: 'SponsorCoin', appUrl: 'https://sponsorcoin.org', email: 'support@sponsorcoin.org' },
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
const fresh = (over) => { const sim = simulatedTrezor(over); return { sim, transport: createTrezorTransport(sim.options()) }; };

await test('the library is loaded and initialised (with the app\'s manifest) only when a device is first used, and only once', async () => {
  const { sim, transport } = fresh();
  assert.equal(sim.calls.loaded, 0);
  assert.equal(transport.isConnected(), false);
  await transport.connect();
  await transport.signMessage(accountAt(0).address, 'x');
  assert.equal(sim.calls.loaded, 1);
  assert.equal(sim.calls.inits, 1);
});

await test('connect reads the first five accounts of the standard Ethereum path m/44\'/60\'/0\'/0/i in one request, without showing them on the device', async () => {
  const { sim, transport } = fresh();
  const rows = await transport.connect();
  assert.equal(sim.calls.getAddress.length, 1);
  assert.deepEqual(sim.calls.getAddress[0].bundle.map((b) => b.path), [0, 1, 2, 3, 4].map((i) => `m/44'/60'/0'/0/${i}`));
  assert.ok(sim.calls.getAddress[0].bundle.every((b) => b.showOnTrezor === false));
  assert.deepEqual(rows.map((r) => r.address), KEYS.map((k, i) => accountAt(i).address));
  assert.equal(rows[0].name, 'Trezor Account 1');
  assert.equal(transport.isConnected(), true);
});

await test('a personal message is signed through the device and the signature equals viem\'s own for the same key (the device answers without 0x)', async () => {
  const { sim, transport } = fresh();
  await transport.connect();
  for (const [i, text] of [[0, 'Sign in to SponsorCoin'], [3, 'tést ✓ unicode message']]) {
    const got = await transport.signMessage(accountAt(i).address, text);
    assert.equal(got, await accountAt(i).signMessage({ message: text }));
    assert.match(got, /^0x[0-9a-f]{130}$/);
  }
  assert.equal(sim.calls.signMessage[0].hex, false);
});

await test('an EIP-1559 transaction is handed to the device as hex fields (nonce, gas with a margin, fees), and the raw transaction returned recovers to the account', async () => {
  const { sim, transport } = fresh();
  await transport.connect();
  const from = accountAt(1).address;
  const raw = await transport.signTransaction({ from, to: '0x000000000000000000000000000000000000dEaD', value: 12345n, chainId: 31337 });
  const sent = sim.calls.signTransaction[0].transaction;
  assert.deepEqual([sent.nonce, sent.gasLimit, sent.value, sent.chainId], ['0x7', '0x6270', '0x3039', 31337]);
  assert.equal(sent.maxPriorityFeePerGas, '0x59682f00');
  assert.equal(sent.gasPrice, undefined);
  const tx = viem.parseTransaction(raw);
  assert.equal(tx.type, 'eip1559');
  assert.equal(tx.nonce, 7);
  assert.equal(tx.gas, 25200n);
  assert.equal(await viem.recoverTransactionAddress({ serializedTransaction: raw }), from);
});

await test('on a chain with no base fee the transaction is a LEGACY one (EIP-155) with a gas price, and it recovers to the account too', async () => {
  const sim = simulatedTrezor({ legacyChain: true });
  const transport = createTrezorTransport(sim.options());
  await transport.connect();
  const from = accountAt(0).address;
  const raw = await transport.signTransaction({ from, to: '0x000000000000000000000000000000000000dEaD', data: '0x', chainId: 56 });
  const sent = sim.calls.signTransaction[0].transaction;
  assert.equal(sent.gasPrice, '0x77359400');
  assert.equal(sent.maxFeePerGas, undefined);
  const tx = viem.parseTransaction(raw);
  assert.equal(tx.type, 'legacy');
  assert.equal(tx.chainId, 56);
  assert.equal(await viem.recoverTransactionAddress({ serializedTransaction: raw }), from);
});

await test('the device\'s error codes become the hardware error set: declined, PIN wrong, no device, in use elsewhere, data it cannot read', async () => {
  const cases = [
    [{ code: 'Failure_ActionCancelled', error: 'Action cancelled by user' }, 'rejected'],
    [{ code: 'Method_Cancel', error: 'Cancelled' }, 'rejected'],
    [{ code: 'Failure_PinInvalid', error: 'PIN invalid' }, 'locked'],
    [{ code: 'Device_NotFound', error: 'Device not found' }, 'unavailable'],
    [{ code: 'Device_UsedElsewhere', error: 'Device is used in another window' }, 'unavailable'],
    [{ code: 'Device_Disconnected', error: 'Device disconnected' }, 'not_connected'],
    [{ code: 'Failure_DataError', error: 'Invalid data' }, 'unsupported'],
  ];
  for (const [payload, code] of cases) {
    const sim = simulatedTrezor({ sign: { success: false, payload } });
    const transport = createTrezorTransport(sim.options());
    await transport.connect();
    await assert.rejects(transport.signMessage(accountAt(0).address, 'x'), (e) => e instanceof HardwareError && e.code === code, payload.code);
  }
});

await test('closing the Trezor popup while CONNECTING is "no Trezor selected" (unavailable), not a decline; a failed connect leaves nothing connected', async () => {
  const sim = simulatedTrezor({ getAddress: { success: false, payload: { code: 'Method_Interrupted', error: 'Popup closed' } } });
  const transport = createTrezorTransport(sim.options());
  await assert.rejects(transport.connect(), (e) => e.code === 'unavailable' && /cancelled/.test(e.message));
  assert.equal(transport.isConnected(), false);
  assert.equal(translateTrezorError({ code: 'Method_Interrupted' }, 'sign').code, 'rejected');
});

await test('an address the Trezor did not give is refused (never signed with another path), and a call before connecting says to connect first', async () => {
  const { transport } = fresh();
  await assert.rejects(transport.signMessage(accountAt(0).address, 'x'), (e) => e.code === 'not_connected');
  await transport.connect();
  await assert.rejects(transport.signMessage('0x1111111111111111111111111111111111111111', 'x'), (e) => e.code === 'unsupported');
});

await test('requests go one at a time: concurrent signs are queued, never overlapped', async () => {
  const { sim, transport } = fresh();
  await transport.connect();
  const a = accountAt(0).address;
  await Promise.all([transport.signMessage(a, 'one'), transport.signMessage(a, 'two'), transport.signMessage(a, 'three')]);
  assert.equal(sim.calls.maxConcurrent, 1);
});

await test('disconnect forgets the accounts and announces the change', async () => {
  const { transport } = fresh();
  let changes = 0;
  transport.onChange(() => { changes += 1; });
  await transport.connect();
  const before = changes;
  await transport.disconnect();
  assert.equal(transport.isConnected(), false);
  assert.deepEqual(transport.accounts(), []);
  assert.ok(changes > before);
});

await test('through the hardware authenticator: the id is hardware:trezor, connect lists the accounts, a send signs on the device and broadcasts the raw transaction, a decline is user_rejected', async () => {
  const sim = simulatedTrezor();
  const transport = createTrezorTransport(sim.options());
  let broadcast;
  const auth = createHardwareAuthenticator(transport, { broadcast: async (raw, chainId) => { broadcast = { raw, chainId }; return '0xhash'; } });
  assert.equal(auth.id, 'hardware:trezor');
  assert.equal(auth.label, 'Trezor');
  const accounts = await auth.connect();
  assert.equal(accounts.length, 5);
  const sent = await auth.sendTransaction({ from: accounts[0].address, to: '0x000000000000000000000000000000000000dEaD', value: 1n, chainId: 31337 });
  assert.equal(sent.hash, '0xhash');
  assert.equal(viem.parseTransaction(broadcast.raw).value, 1n);
  const declining = createHardwareAuthenticator(createTrezorTransport(simulatedTrezor({ sign: { success: false, payload: { code: 'Failure_ActionCancelled', error: 'x' } } }).options()), { broadcast: async () => '0x' });
  const list = await declining.connect();
  await assert.rejects(declining.signMessage(list[0].address, 'x'), (e) => e instanceof AuthenticatorError && e.code === 'user_rejected');
});

let failed = 0;
for (const [status, text] of results) { console.log(status + ' ' + text); if (status === 'FAIL') failed += 1; }
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
