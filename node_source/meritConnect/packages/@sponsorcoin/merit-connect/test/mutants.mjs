// File: test/mutants.mjs
//
// Mutation check for the protocol rules (docs/design/meritConnectDesign.txt, rows M4 to M6): each mutant breaks ONE rule in a copy of dist/ and the matching test file must then FAIL. A mutant the tests do not catch means a rule
// that is not really tested. Run: node test/mutants.mjs   (after `npm run build`; exits non-zero when a mutant survives)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');

const MUTANTS = [
  // relay: the trust rules moved from the extension's webAppRelay
  { name: 'anyMethod', file: 'relay.js', from: 'if (!METHODS.has(method))', to: 'if (false)', test: 'relay' },
  { name: 'anyPage', file: 'relay.js', from: 'if (sender.id !== entry.targetId || sender.origin !== entry.origin)', to: 'if (sender.origin !== entry.origin)', test: 'relay' },
  { name: 'anyOrigin', file: 'relay.js', from: 'if (sender.id !== entry.targetId || sender.origin !== entry.origin)', to: 'if (sender.id !== entry.targetId)', test: 'relay' },
  { name: 'replay', file: 'relay.js', from: '        pending.delete(rid);\n', to: '', test: 'relay' },
  { name: 'noCap', file: 'relay.js', from: 'if (pending.size >= MAX_PENDING)', to: 'if (false)', test: 'relay' },
  { name: 'firstTarget', file: 'relay.js', from: 'all.find((t) => t.ready) ?? all[0]', to: 'all[0]', test: 'relay' },
  { name: 'closedIgnored', file: 'relay.js', from: 'if (entry.targetId !== targetId)\n                continue;', to: 'if (true)\n                continue;', test: 'relay' },
  // relay: the selection sessions
  { name: 'sessionForAnyMethod', file: 'relay.js', from: "entry.method === 'eth_requestAccounts'", to: 'true', test: 'relay' },
  { name: 'pushFromAnyPage', file: 'relay.js', from: 'if (sender.id !== session.targetId || sender.origin !== session.origin)', to: 'if (sender.origin !== session.origin)', test: 'relay' },
  { name: 'pushFromAnyOrigin', file: 'relay.js', from: 'if (sender.id !== session.targetId || sender.origin !== session.origin)', to: 'if (sender.id !== session.targetId)', test: 'relay' },
  { name: 'sessionNeverExpires', file: 'relay.js', from: 'if (now >= session.expires)', to: 'if (false)', test: 'relay' },
  { name: 'closeKeepsSession', file: 'relay.js', from: '            sessions.delete(push.rid);\n', to: '', test: 'relay' },
  { name: 'dropTargetKeepsSessions', file: 'relay.js', from: 'if (session.targetId === targetId)', to: 'if (false)', test: 'relay' },
  // responder
  { name: 'openingDoesNotSync', file: 'responder.js', from: 'handlers.setShared(start);', to: '', test: 'responder' },
  { name: 'startNotFiltered', file: 'responder.js', from: '.filter((a) => offered.some((o) => sameAddress(o, a)))', to: '', test: 'responder' },
  { name: 'signWithoutSharedCheck', file: 'responder.js', from: 'if (!isShared(account))', to: 'if (false)', test: 'responder' },
  { name: 'revokeKeepsList', file: 'responder.js', from: '            handlers.setShared([]);\n', to: '', test: 'responder' },
  { name: 'closeNotPushed', file: 'responder.js', from: "if (answered)\n                    deps.push({ v: PROTOCOL_VERSION, rid, kind: 'selection', closed: true });", to: "if (false)\n                    deps.push({ v: PROTOCOL_VERSION, rid, kind: 'selection', closed: true });", test: 'responder' },
  { name: 'notOneAtATime', file: 'responder.js', from: '        chain = done;\n', to: '', test: 'responder' },
  { name: 'unfilteredAddresses', file: 'responder.js', from: 'selected.filter(isAddress).slice(0, MAX_SHARED)', to: 'selected', test: 'responder' },
  // client
  { name: 'noLinkWait', file: 'client.js', from: 'if (config.link().connected)\n            return Promise.resolve(true);', to: 'return Promise.resolve(config.link().connected);', test: 'client' },
  { name: 'failedHandshakeClears', file: 'client.js', from: "return unchanged('failed');", to: "await config.setShared([]); return unchanged('failed');", test: 'client' },
  { name: 'revokeNoResync', file: 'client.js', from: '        needsResync = true;\n        const rid', to: '        const rid', test: 'accountStates' },
  { name: 'revokeClearsCallerList', file: 'client.js', from: '        needsResync = true;\n        const rid', to: '        needsResync = true; await config.setShared([]);\n        const rid', test: 'client' },
  { name: 'noHandshakeGap', file: 'client.js', from: 'config.now() - lastHandshakeAt < HANDSHAKE_MIN_GAP_MS', to: 'false', test: 'client' },
  { name: 'rewritesSameList', file: 'client.js', from: 'const changed = !sameList(next, stored);', to: 'const changed = true;', test: 'client' },
  // account states (row M15): the owner's rules about who removes and who only changes the state
  { name: 'remoteDisconnectKeepsAccount', file: 'client.js', from: 'const next = union(without(stored, removed), added);', to: 'const next = union(stored, added);', test: 'accountStates' },
  { name: 'localDisconnectRemovesAccount', file: 'client.js', from: 'await writeDisconnected(config.setDisconnected ? union(kept, [address]) : kept);', to: 'await writeDisconnected(kept);', test: 'accountStates' },
  { name: 'resyncKeepsMissing', file: 'client.js', from: 'const next = without(stored, missing);', to: 'const next = stored;', test: 'accountStates' },
  { name: 'resyncNoNotice', file: 'client.js', from: "announce(missing, 'missing');", to: '', test: 'accountStates' },
  { name: 'pullNoNotice', file: 'client.js', from: "announce(removed, 'disconnected');", to: '', test: 'accountStates' },
  { name: 'resyncSendsNothing', file: 'client.js', from: "syncRemote(stored, 'reconnect')", to: "syncRemote([], 'reconnect')", test: 'accountStates' },
  { name: 'connectNotCheckedOnRemote', file: 'client.js', from: 'if (!has(now, address))', to: 'if (false)', test: 'accountStates' },
  { name: 'syncIgnoresWhatExistsHere', file: 'responder.js', from: '.filter((a) => offered.some((o) => sameAddress(o, a))).slice(0, MAX_SHARED);\n                handlers.setShared(connected);', to: '.slice(0, MAX_SHARED);\n                handlers.setShared(connected);', test: 'responder' },
  { name: 'syncDoesNotSetShared', file: 'responder.js', from: 'handlers.setShared(connected);', to: '', test: 'responder' },
  // connection monitor (row M13)
  { name: 'silentIsNoPage', file: 'connection.js', from: "candidates > 0 ? 'page-silent' : 'no-page'", to: "'no-page'", test: 'connection' },
  { name: 'detachedLoses', file: 'connection.js', from: "detached ? 'detached' : !probed", to: '!probed', test: 'connection' },
  { name: 'unknownIsNoPage', file: 'connection.js', from: "!probed || !lastProbe ? 'unknown'", to: "false ? 'unknown'", test: 'connection' },
  { name: 'notifiesAlways', file: 'connection.js', from: 'if (sameStatus(status, next))\n            return status;', to: 'if (false)\n            return status;', test: 'connection' },
  { name: 'probePerCaller', file: 'connection.js', from: 'if (inflight)\n            return inflight;', to: 'if (false)\n            return inflight;', test: 'connection' },
  { name: 'loggedOutNotConnected', file: 'connection.js', from: "reporting > 0 ? 'connected'", to: "reporting > 0 && lastProbe.loggedOn ? 'connected'", test: 'connection' },
  // protocol
  { name: 'acceptsAnyVersion', file: 'protocol.js', from: '!SUPPORTED_VERSIONS.includes(data.v)) {\n        return { kind: \'refuse\'', to: 'false) {\n        return { kind: \'refuse\'', test: 'protocol' },
  { name: 'ridAnything', file: 'protocol.js', from: 'RID.test(value)', to: "typeof value === 'string'", test: 'protocol' },
];

const normalize = (text) => text.replace(/\r\n/g, '\n');
let survived = 0;
let skipped = 0;

for (const m of MUTANTS) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mc-mutant-'));
  fs.cpSync(path.join(ROOT, 'dist'), path.join(tmp, 'dist'), { recursive: true });
  fs.cpSync(path.join(ROOT, 'test'), path.join(tmp, 'test'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'package.json'), '{"type":"module"}');
  const target = path.join(tmp, 'dist', m.file);
  const source = normalize(fs.readFileSync(target, 'utf8'));
  if (!source.includes(m.from)) {
    console.log(`ANCHOR MISSING  ${m.name}  (${m.file}): the build no longer contains the text this mutant breaks`);
    skipped++;
    continue;
  }
  fs.writeFileSync(target, source.replace(m.from, m.to));
  const run = spawnSync(process.execPath, [path.join(tmp, 'test', `${m.test}.test.mjs`)], { encoding: 'utf8', timeout: 20_000 });
  const caught = run.status !== 0;
  console.log(`${caught ? 'caught  ' : 'SURVIVED'}  ${m.name}  (${m.file} -> ${m.test}.test)`);
  if (!caught) survived++;
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log(survived || skipped ? `\n${survived} survived, ${skipped} anchors missing of ${MUTANTS.length}` : `\nall ${MUTANTS.length} mutants caught`);
process.exit(survived || skipped ? 1 : 0);
assert.ok(true);
