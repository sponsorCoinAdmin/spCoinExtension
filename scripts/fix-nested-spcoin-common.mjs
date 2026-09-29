// File: scripts/fix-nested-spcoin-common.mjs
//
// 2026-09-29, real fix — npm resolves @sponsorcoin/spcoin-common
// separately for each node_source/*/packages/@sponsorcoin/* package that
// declares it as a dependency (spcoin-exchange-engine, spcoin-hooks,
// spcoin-onchain, spcoin-panels), rather than deduping to this repo's own
// root-level symlinked copy. Because that root copy was hand-created (real
// symlink creation is blocked in this environment — EPERM), npm has no way
// to dedupe the nested resolutions onto it, so it fetches
// @sponsorcoin/spcoin-common@^0.0.1 fresh from the public registry into
// each nested node_modules — a real, published-but-stale snapshot (missing
// e.g. the "./styles" export subpath this repo's own live source already
// has), which breaks the Vite build with a real "not exported under the
// conditions" error the moment anything imports it.
//
// A package.json "overrides" entry (both the plain file: path form and the
// "$@sponsorcoin/spcoin-common" self-reference form) was tried first and
// did NOT reliably force the nested resolutions onto the local source in
// this npm version — the nested copies kept landing on the stale
// registry-published 0.0.1 regardless. This script is the durable fix:
// wired as this package's own "postinstall" script (runs automatically
// after every `npm install`/`npm ci`, including CI), it overwrites every
// nested @sponsorcoin/spcoin-common copy with the current live source, so
// the build always sees the real thing regardless of what npm resolved.

import { existsSync, cpSync, rmSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const liveSource = join(repoRoot, 'node_source/spCoinCommon/packages/@sponsorcoin/spcoin-common');

if (!existsSync(liveSource)) {
  console.warn('[fix-nested-spcoin-common] live source not found, skipping:', liveSource);
  process.exit(0);
}

const packagesRoot = join(repoRoot, 'node_source');
let fixedCount = 0;

for (const groupDir of readdirSync(packagesRoot, { withFileTypes: true })) {
  if (!groupDir.isDirectory()) continue;
  const nestedPath = join(
    packagesRoot,
    groupDir.name,
    'packages/@sponsorcoin',
  );
  if (!existsSync(nestedPath)) continue;

  for (const pkgDir of readdirSync(nestedPath, { withFileTypes: true })) {
    if (!pkgDir.isDirectory()) continue;
    const nestedSpcoinCommon = join(nestedPath, pkgDir.name, 'node_modules/@sponsorcoin/spcoin-common');
    if (!existsSync(nestedSpcoinCommon)) continue;
    // Never touch the live source's own directory, even though it would
    // never structurally match this node_modules-nested glob anyway.
    if (nestedSpcoinCommon === liveSource) continue;

    rmSync(nestedSpcoinCommon, { recursive: true, force: true });
    cpSync(liveSource, nestedSpcoinCommon, { recursive: true });
    fixedCount += 1;
    console.log('[fix-nested-spcoin-common] refreshed', nestedSpcoinCommon);
  }
}

console.log(`[fix-nested-spcoin-common] done — ${fixedCount} nested cop${fixedCount === 1 ? 'y' : 'ies'} refreshed.`);
