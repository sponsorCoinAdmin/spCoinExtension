// File: scripts/check-no-ethers.mjs
//
// 2026-09-29 — extension-only "no ethers" check (on request, "migrate
// Extension ethers lint rule"). This extension is deliberately ethers-free
// (see docs/estimate.txt's "Extension divergence: no ethers, no MetaMask,
// explicit confirmations" top risk, and package.json's own dependency list
// — viem/wagmi only, no ethers anywhere). Real trade/transaction execution
// here goes through @sponsorcoin/spcoin-exchange-engine's
// TradeExecutorContext abstraction (viem-backed for the extension, ethers-
// backed only in the web app's own tradeExecutorEthers.ts), not a direct
// signer. An 'ethers' import creeping into this repo's own code would be a
// real regression, reintroducing a dependency this extension was
// specifically built without.
//
// Plain source-text scan, not a real ESLint rule: @typescript-eslint/parser
// hard-refuses to run at all against this project's TypeScript version
// (7.0.x — "typescript-eslint does not support TS 7.0", a real runtime
// error, not a soft peer-range warning), and downgrading the project's own
// TypeScript just to satisfy a lint tool's parser was out of scope for this
// narrow a check. Scoped to exactly this package's own code (mirrors
// tsconfig.json's own "include": ["src", "sidepanel.ts", "vite.config.ts"])
// — NOT node_source/, which holds the shared @sponsorcoin/* packages also
// consumed by the web app, where ethers usage is legitimate today (e.g.
// tradeExecutorEthers.ts); those packages have their own separate
// build/lint concerns.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

// Matches `from 'ethers'`, `from "ethers/..."`, and `require('ethers')` —
// deliberately does not match e.g. 'ethers-something-else' (word-boundary
// via the closing quote/slash), and does not flag mere substring mentions
// in comments/strings elsewhere (a real import/require call is what
// actually pulls the dependency into the bundle).
const ETHERS_IMPORT_RE = /(?:from\s+|require\()\s*['"]ethers(?:\/[^'"]*)?['"]/;

function collectFiles(dir, out) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(full, out);
    } else if (['.ts', '.tsx'].includes(extname(entry.name))) {
      out.push(full);
    }
  }
}

const targets = [];
const srcDir = join(repoRoot, 'src');
if (statSync(srcDir, { throwIfNoEntry: false })?.isDirectory()) {
  collectFiles(srcDir, targets);
}
for (const topLevel of ['sidepanel.ts', 'vite.config.ts']) {
  const full = join(repoRoot, topLevel);
  if (statSync(full, { throwIfNoEntry: false })?.isFile()) targets.push(full);
}

const violations = [];
for (const file of targets) {
  const text = readFileSync(file, 'utf8');
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    if (ETHERS_IMPORT_RE.test(line)) {
      violations.push(`${file.slice(repoRoot.length + 1)}:${i + 1}: ${line.trim()}`);
    }
  });
}

if (violations.length > 0) {
  console.error(
    "This extension is deliberately ethers-free (viem/wagmi only) — see this script's own header comment. Found 'ethers' import(s):\n",
  );
  for (const v of violations) console.error('  ' + v);
  process.exit(1);
}

console.log(`[check-no-ethers] clean — checked ${targets.length} file(s), no 'ethers' imports found.`);
