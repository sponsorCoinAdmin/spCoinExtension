// File: src/localReads.ts
//
// docs/meritMigrationFinal.txt row I2 (independence: once built, the wallet needs nothing from the web app to run). The wallet's read methods (the Sponsor list's account record, the role checks, the sponsor / recipient / agent keys and links, the rate lists, the transaction
// records, the sponsor tree) used to be asked of the web server's /api/spCoin/run-script route; on a computer where the web app does not exist every one of them failed and the Sponsor list stayed empty. They are now answered HERE, in the extension, from the chain:
// the access modules' own readWalletMethod (the code the web route calls too) over a contract built from the extension's RPC, the deployed address and the bundled spCoin ABI. No request leaves for any web app. The chain library stays inside the shared package
// (createWalletReadAccess), so this file imports no ethers (scripts/check-no-ethers.mjs still holds for the extension's own source).
import type { RunScriptParams } from '@sponsorcoin/spcoin-onchain';
import { createParamReaders, createWalletReadAccess, isWalletReadMethod, readWalletMethod, sanitizeJsonValue } from '@sponsorcoin/spcoin-access-modules';
import { findSpCoinDeploymentVersion, spCoinAbiPathForVersion } from '@sponsorcoin/spcoin-exchange-engine';
import { bundledFeedData } from './bundledFeeds';

const DEPLOYMENT_MAP = '/resources/data/networks/spCoinDeployment.json';

/** The bundled ABI of the spCoin version deployed at this address (the newest bundled one when the address is not in the deployment map). */
function abiFor(contractAddress: string): unknown[] {
  const version = findSpCoinDeploymentVersion(bundledFeedData[DEPLOYMENT_MAP], contractAddress);
  const byVersion = version ? bundledFeedData[spCoinAbiPathForVersion(version)] : undefined;
  if (Array.isArray(byVersion)) return byVersion;
  const newest = Object.keys(bundledFeedData)
    .filter((key) => /^\/assets\/ABIs\/spCoin\/V_.+\.json$/.test(key))
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))[0];
  const fallback = newest ? bundledFeedData[newest] : undefined;
  if (Array.isArray(fallback)) return fallback;
  throw new Error(`No spCoin ABI is bundled for ${contractAddress}.`);
}

/** True for the methods this file answers on its own. */
export const canReadLocally = (method: string): boolean => isWalletReadMethod(method);

export async function readSpCoinLocally(params: RunScriptParams, method: string, args: { key: string; value: string }[] = []): Promise<unknown> {
  if (!params.rpcUrl) throw new Error(`Cannot read ${method}: no RPC url for this network.`);
  const { contract, read } = createWalletReadAccess({ rpcUrl: params.rpcUrl, contractAddress: params.contractAddress, abi: abiFor(params.contractAddress) });
  const readers = createParamReaders(args.map((entry) => ({ key: String(entry?.key ?? '').trim(), value: String(entry?.value ?? '').trim() })));
  return sanitizeJsonValue(await readWalletMethod({ contract, read, ...readers }, method));
}
