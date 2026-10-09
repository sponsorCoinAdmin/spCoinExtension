// File: scripts/bundleFeeds.mjs
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt, table row 17, E5) -- snapshot the small static files the extension needs into
// src/bundledFeedData.json, MetaMask style (bundled defaults, live data wins when the hosted app answers). Keys are request paths, the same
// strings the feeds ask for, so spcoin-feeds' registerBundledFeeds can answer them when the app is unreachable.
//   node scripts/bundleFeeds.mjs [path-to-web-app-checkout]
// Covers every network in the feeds registry (info, default settings, token lists, role account lists) and the spCoin ABIs + deployment map.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const web = path.resolve(process.argv[2] ?? path.join(here, '..', '..', 'spcoin-nextjs-front-end'));
const feedsNetworks = path.join(here, '..', 'node_source', 'spCoinFeeds', 'packages', '@sponsorcoin', 'spcoin-feeds', 'dist', 'networks', 'index.js');
const { listConfiguredNetworks } = await import(pathToFileURL(feedsNetworks).href);

const out = {};
const add = (key, file) => {
  if (!fs.existsSync(file)) return false;
  out[key] = JSON.parse(fs.readFileSync(file, 'utf8'));
  return true;
};

const chains = listConfiguredNetworks({ showTestNets: true }).map((n) => n.chainId);
const ROLE_FILES = ['agents.accounts.json', 'recipients.accounts.json', 'sponsors.accounts.json'];
for (const id of chains) {
  const dir = path.join(web, 'public', 'assets', 'blockchains', String(id));
  if (!fs.existsSync(dir)) continue;
  for (const file of fs.readdirSync(dir)) {
    if (!/\.json$/i.test(file)) continue;
    if (/^(info|defaultNetworkSettings|tokenlist|tokenlist-extended)\.json$/i.test(file) || ROLE_FILES.includes(file)) add(`/assets/blockchains/${id}/${file}`, path.join(dir, file));
  }
}
const abiDir = path.join(web, 'public', 'assets', 'ABIs', 'spCoin');
if (fs.existsSync(abiDir)) for (const f of fs.readdirSync(abiDir)) if (/^V_.+\.json$/.test(f)) add(`/assets/ABIs/spCoin/${f}`, path.join(abiDir, f));
add('/resources/data/networks/spCoinDeployment.json', path.join(web, 'resources', 'data', 'networks', 'spCoinDeployment.json'));
add('/assets/miscellaneous/meritInfo.json', path.join(web, 'public', 'assets', 'miscellaneous', 'meritInfo.json'));

const target = path.join(here, '..', 'src', 'bundledFeedData.json');
fs.writeFileSync(target, JSON.stringify(out));
console.log(`bundled ${Object.keys(out).length} files for chains [${chains.join(', ')}] -> ${path.relative(process.cwd(), target)} (${(fs.statSync(target).size / 1024).toFixed(0)} KB)`);
