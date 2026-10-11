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
  out[key] = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
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
// 2026-10-11 (plan row 13): the recipient / agent / sponsor role lists the shared pickers read (the engine's bundled-feed registry, see src/bundledFeeds.ts).
for (const role of ['recipients', 'agents', 'sponsors']) add('/assets/accounts/accountRoles/' + role + '.json', path.join(web, 'public', 'assets', 'accounts', 'accountRoles', role + '.json'));
const abiDir = path.join(web, 'public', 'assets', 'ABIs', 'spCoin');
if (fs.existsSync(abiDir)) for (const f of fs.readdirSync(abiDir)) if (/^V_.+\.json$/.test(f)) add(`/assets/ABIs/spCoin/${f}`, path.join(abiDir, f));
add('/resources/data/networks/spCoinDeployment.json', path.join(web, 'resources', 'data', 'networks', 'spCoinDeployment.json'));
add('/assets/miscellaneous/meritInfo.json', path.join(web, 'public', 'assets', 'miscellaneous', 'meritInfo.json'));
// 2026-10-11 (docs/nodeSourceMigrationPlan.txt row 25, owner: "I do not want any dependency on the web app"): the account profiles (name, symbol, description of every public account; the avatars are too big to bundle and fall back to the default image) and the
// server's active spCoin per chain (public/assets/spCoinLab/networks/<chainId>/activeSpCoin.json, in the shape the API returns it), so the extension asks the hosted app for neither. Account paths are matched without regard to case, so they are stored lower-case.
const accountsDir = path.join(web, 'public', 'assets', 'accounts');
let profiles = 0;
if (fs.existsSync(accountsDir)) {
  for (const dir of fs.readdirSync(accountsDir)) {
    const file = path.join(accountsDir, dir, 'account.json');
    if (/^0[xX][0-9a-fA-F]{40}$/.test(dir) && add(`/assets/accounts/${dir.toLowerCase()}/account.json`, file)) profiles += 1;
  }
}
const networksDir = path.join(web, 'public', 'assets', 'spCoinLab', 'networks');
if (fs.existsSync(networksDir)) {
  for (const id of fs.readdirSync(networksDir)) {
    const file = path.join(networksDir, id, 'activeSpCoin.json');
    if (!fs.existsSync(file)) continue;
    const { activeSpCoin, ...rest } = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
    if (typeof activeSpCoin === 'string') out[`/api/spCoin/lab/networks/${id}/activeSpCoin`] = { address: activeSpCoin, chainId: Number(id), ...rest };
  }
}
console.log(`bundled ${profiles} account profiles`);
// 2026-10-11: each chain's native token (the 0xEeee... placeholder's info.json), under the path the hosted API serves it from (/api/native-token/<chainId>), so the Send tab shows ETH, not the network's symbol, with no request.
let natives = 0;
for (const id of chains) {
  const contracts = path.join(web, 'public', 'assets', 'blockchains', String(id), 'contracts');
  if (!fs.existsSync(contracts)) continue;
  const dir = fs.readdirSync(contracts).find((d) => d.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee');
  if (dir && add(`/api/native-token/${id}`, path.join(contracts, dir, 'info.json'))) natives += 1;
}
console.log(`bundled ${natives} native tokens`);

// 2026-10-11 (plan row 13): the details (name, symbol, decimals) of every token in the bundled token lists, under the path the hosted tokens API serves them from
// (/api/spCoin/tokens/<chainId>/<address, lower case>), so the shared token picker shows names and symbols without asking the hosted app. The Hardhat chain (31337)
// keeps its token folders under Base (8453) on disk, so its lists are the Base list plus its own, as the engine builds them.
let tokenDetails = 0;
const listOfChain = (id) => {
  const key = Object.keys(out).find((k) => k.toLowerCase() === '/assets/blockchains/' + id + '/tokenlist.json');
  return key && Array.isArray(out[key]) ? out[key] : [];
};
for (const id of chains) {
  const diskId = id === 31337 ? 8453 : id;
  const contracts = path.join(web, 'public', 'assets', 'blockchains', String(diskId), 'contracts');
  if (!fs.existsSync(contracts)) continue;
  const folders = new Map(fs.readdirSync(contracts).map((d) => [d.toLowerCase(), d]));
  const addresses = new Set([...(id === 31337 ? listOfChain(8453) : []), ...listOfChain(id)].map((a) => String(a).toLowerCase()));
  for (const address of addresses) {
    const folder = folders.get(address);
    const file = folder && path.join(contracts, folder, 'info.json');
    if (!file || !fs.existsSync(file)) continue;
    const info = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
    out['/api/spCoin/tokens/' + id + '/' + address] = { chainId: id, address, data: info };
    tokenDetails += 1;
  }
}
console.log('bundled ' + tokenDetails + ' token detail records');

const target = path.join(here, '..', 'src', 'bundledFeedData.json');
fs.writeFileSync(target, JSON.stringify(out));
console.log(`bundled ${Object.keys(out).length} files for chains [${chains.join(', ')}] -> ${path.relative(process.cwd(), target)} (${(fs.statSync(target).size / 1024).toFixed(0)} KB)`);
