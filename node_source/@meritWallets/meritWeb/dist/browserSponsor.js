// File: src/browserSponsor.ts
//
// 2026-11-19 (docs/design/standAloneWalletInstall.txt) -- the browser wallet's REWARDS and STAKING hosts: what the Rewards tab (estimate, claim, trading and staked figures) and the Sponsor tab's staking list ask of their host. It is the extension's
// sidepanel.ts rewardsHost / stakingHost with the vault authenticator in place of the extension's worker, and the extension's localReads.ts for the reads: every view is answered from the chain over the page's RPC (the access modules' own read code, the
// bundled spCoin ABI of the deployed version), so no hosted app is asked for anything. A claim or an un-stake leg goes to the vault's approval queue (the approval page asks first), then is signed, sent and waited for.
import { encodeFunctionData } from 'viem';
import { createWalletReadAccess, createParamReaders, isWalletReadMethod, readWalletMethod, sanitizeJsonValue } from '@sponsorcoin/spcoin-access-modules';
import { findSpCoinDeploymentVersion, getPreferredSpCoinContractAddress, spCoinAbiPathForVersion } from '@sponsorcoin/spcoin-exchange-engine';
import { executeClaimTransactionCore, SPOIN_CLAIM_ABI } from '@sponsorcoin/spcoin-onchain';
import { SPOIN_STAKE_ABI, createDirectReadStep, estimateRewardsByMethod, claimAmountsFor, readChainTimestamp, throttleRead, } from '@sponsorcoin/merit-wallet';
import { createBrowserTradeExecutor } from './browserTrade';
import { publicClientFor } from './chainClients';
import { registeredBrowserData } from './registerBrowserData';
const DEPLOYMENT_MAP = '/resources/data/networks/spCoinDeployment.json';
const NO_SPCOIN_ADDRESS = '0x0000000000000000000000000000000000000000';
/** The bundled ABI of the spCoin version deployed at this address (the newest bundled one when the address is not in the deployment map). */
function abiFor(contractAddress) {
    const data = registeredBrowserData() ?? {};
    const version = findSpCoinDeploymentVersion(data[DEPLOYMENT_MAP], contractAddress);
    const byVersion = version ? data[spCoinAbiPathForVersion(version)] : undefined;
    if (Array.isArray(byVersion))
        return byVersion;
    const newest = Object.keys(data)
        .filter((key) => /^\/assets\/ABIs\/spCoin\/V_.+\.json$/.test(key))
        .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))[0];
    const fallback = newest ? data[newest] : undefined;
    if (Array.isArray(fallback))
        return fallback;
    throw new Error(`No spCoin ABI is bundled for ${contractAddress}.`);
}
const directReads = createDirectReadStep(SPOIN_STAKE_ABI);
/** One contract view: the stake ABI slice straight over viem, every other wallet read through the access modules over the bundled ABI. */
export async function readSpCoin(params, method, args = []) {
    if (!params.rpcUrl)
        throw new Error(`Cannot read ${method}: no RPC url for this network.`);
    if (directReads.handles(method))
        return directReads.read({ contractAddress: params.contractAddress, rpcUrl: params.rpcUrl }, method, args);
    if (!isWalletReadMethod(method))
        throw new Error(`The wallet cannot read ${method} on its own.`);
    const { contract, read } = createWalletReadAccess({ rpcUrl: params.rpcUrl, contractAddress: params.contractAddress, abi: abiFor(params.contractAddress) });
    const readers = createParamReaders(args.map((entry) => ({ key: String(entry?.key ?? '').trim(), value: String(entry?.value ?? '').trim() })));
    return sanitizeJsonValue(await readWalletMethod({ contract, read, ...readers }, method));
}
/** The two hosts, built once per wallet: stable objects, so the panels do not refetch on every render. */
export function createBrowserSponsorHosts({ authenticator, chainId, rpcUrl, from, onChanged }) {
    const spCoinAddress = () => getPreferredSpCoinContractAddress(chainId) ?? NO_SPCOIN_ADDRESS;
    const read = (method, args) => readSpCoin({ contractAddress: spCoinAddress(), rpcUrl }, method, args);
    const chainRead = throttleRead(read);
    const executorFor = (account) => createBrowserTradeExecutor(authenticator, account, rpcUrl);
    const rewardsHost = {
        contractAddress: spCoinAddress,
        rpcUrl,
        accessSource: 'local',
        readMode: 'hardhat',
        blockTimestamp: () => readChainTimestamp((method, params) => publicClientFor(rpcUrl).request({ method, params })),
        estimate: (method, accountKey, now) => estimateRewardsByMethod(method, { accountKey, read: chainRead, now }),
        readAccountRecord: (accountKey) => read('getAccountRecord', [{ key: 'Account Key', value: accountKey }]),
        claim: async (method, accountKey) => {
            // what this claim will pay, for the approval screen: the same estimate the Rewards page shows, picked for the role being claimed (no estimate, no amount line)
            const { amountText, roleAmounts } = await claimAmountsFor(method, { accountKey, read: chainRead, now: await readChainTimestamp((m, params) => publicClientFor(rpcUrl).request({ method: m, params })) });
            const result = await executeClaimTransactionCore({
                amountText,
                roleAmounts,
                accountKey,
                method: method,
                contractAddress: spCoinAddress(),
                chainId,
                rpcUrl,
                fromAddress: accountKey,
                context: { account: { address: accountKey, isConnected: true, chainId }, executor: executorFor(accountKey) },
                abi: SPOIN_CLAIM_ABI,
            });
            return { transactionHash: result.transactionHash };
        },
        onClaimed: () => onChanged?.(),
    };
    const spCoinContract = { address: spCoinAddress(), chainId, name: 'Sponsor Coin', symbol: 'SPCOIN', decimals: 18, balance: 0n };
    const stakingHost = {
        contractAddress: spCoinAddress,
        read,
        send: async (method, args) => {
            const account = from();
            if (!account)
                throw new Error('Select and activate an account first.');
            const result = await executorFor(account).execute({
                to: spCoinAddress(),
                data: encodeFunctionData({ abi: SPOIN_STAKE_ABI, functionName: method, args: args }),
                chainId,
                rpcUrl,
                display: { title: 'Un-Stake', label: method, contractAddress: spCoinAddress() },
            });
            const receipt = result.receipt;
            return { hash: result.transactionHash, gasUsed: receipt ? BigInt(receipt.gasUsed) : undefined, gasPrice: receipt?.gasPrice != null ? BigInt(receipt.gasPrice) : undefined };
        },
        loadProfile: async (address) => ({ address }),
        spCoinContract,
        onChanged: () => onChanged?.(),
    };
    return { rewardsHost, stakingHost };
}
