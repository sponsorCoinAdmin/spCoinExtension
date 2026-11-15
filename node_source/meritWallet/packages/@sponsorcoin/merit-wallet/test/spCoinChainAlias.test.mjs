// File: test/spCoinChainAlias.test.mjs
//
// docs/meritMigration.txt row 34: the Sponsor tab goes to STAKE mode (no approve, no swap) when the pay token is the active spCoin (useSponsorMode -> isSpCoin). On the Hardhat fork the token list is read through the
// asset map (31337 -> 8453), so the token carries 8453 while spCoinDeployment.json keys the spCoins under 31337: isSpCoin must also try the ORIGINAL chain id, or the extension stays in SPONSOR mode and fails at the swap step.
// Run: node test/spCoinChainAlias.test.mjs
// MUTANT=noOriginalId|noMappedId|modeIgnoresSpCoin run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ENGINE = path.join(HERE, '..', '..', '..', '..', '..', 'spCoinExchangeEngine', 'packages', '@sponsorcoin', 'spcoin-exchange-engine', 'src');
const m = process.env.MUTANT;
const read = (...p) => fs.readFileSync(path.join(...p), 'utf8').replace(/\r\n/g, '\n');
const swap = (text, from, to) => { assert.ok(text.includes(from), 'mutant anchor missing: ' + from); return text.replace(from, to); };

let utils = read(ENGINE, 'utils', 'spCoinCoreUtils.ts');
let mode = read(ENGINE, 'hooks', 'trade', 'useSponsorMode.ts');
if (m === 'noOriginalId') utils = swap(utils, '      candidateChainIds.add(toOriginalChainId(rawChainId));\n', '');
if (m === 'noMappedId') utils = swap(utils, '      candidateChainIds.add(toMappedChainId(rawChainId));\n', '');
if (m === 'modeIgnoresSpCoin') mode = swap(mode, '    : isSpCoinCheck(sellTokenContract)\n    ? \'STAKE\'', '    : false\n    ? \'STAKE\'');

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

await test('isSpCoin tries the token chain id, its mapped id AND its original id', () => {
  const body = utils.slice(utils.indexOf('const isSpCoin ='), utils.indexOf('/** Convenience helpers'));
  assert.match(body, /candidateChainIds\.add\(rawChainId\);/);
  assert.match(body, /candidateChainIds\.add\(toMappedChainId\(rawChainId\)\);/);
  assert.match(body, /candidateChainIds\.add\(toOriginalChainId\(rawChainId\)\);/);
  assert.match(utils, /import \{ toMappedChainId, toOriginalChainId \} from '\.\/chainIdMap';/);
});
await test('the Sponsor mode is STAKE whenever the pay token is a spCoin (no approve, no swap)', () => {
  assert.match(mode, /: isSpCoinCheck\(sellTokenContract\)\n\s+\? 'STAKE'/);
});

let failed = 0;
for (const [status, name] of results) { console.log(status + ' ' + name); if (status === 'FAIL') failed++; }
process.exit(failed ? 1 : 0);
