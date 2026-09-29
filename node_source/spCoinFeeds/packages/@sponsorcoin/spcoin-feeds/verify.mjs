// Throwaway verification script — not part of the package, not published
// (excluded by package.json's "files" allowlist). Exercises only the read
// paths against the real running dev server, per the plan's "implement
// read/write, exercise read first" instruction. Run: node verify.mjs
import { fetchKeystoreAccounts, fetchAccountMetadata, fetchAccountListGroups } from './dist/accounts/index.js';
import { fetchTokenList, fetchTokenByAddress } from './dist/tokens/index.js';
import { listConfiguredNetworks, toNetworkListEntries } from './dist/networks/index.js';

const config = { baseUrl: 'http://localhost:3000' };
const HARDHAT_CHAIN_ID = 31337;
const MAINNET_CHAIN_ID = 1;

function section(title) {
  console.log(`\n=== ${title} ===`);
}

async function main() {
  section('accounts: fetchKeystoreAccounts(31337)');
  const keystoreEntries = await fetchKeystoreAccounts(HARDHAT_CHAIN_ID, config);
  console.log(`${keystoreEntries.length} entries`, keystoreEntries.slice(0, 3));

  if (keystoreEntries[0]) {
    section(`accounts: fetchAccountMetadata(${keystoreEntries[0].address})`);
    const metadata = await fetchAccountMetadata(keystoreEntries[0].address, config);
    console.log(metadata);
  }

  section('accounts: fetchAccountListGroups(31337) [composed]');
  const groups = await fetchAccountListGroups(HARDHAT_CHAIN_ID, config);
  console.log(JSON.stringify(groups, null, 2));

  section('tokens: fetchTokenList(1, {pageSize:5})');
  const tokenPage = await fetchTokenList(MAINNET_CHAIN_ID, { pageSize: 5 }, config);
  console.log(`page ${tokenPage.page}/${tokenPage.totalPages}, ${tokenPage.totalItems} total`);
  console.log(tokenPage.items);

  if (tokenPage.items[0]) {
    section(`tokens: fetchTokenByAddress(1, ${tokenPage.items[0].address})`);
    const token = await fetchTokenByAddress(MAINNET_CHAIN_ID, tokenPage.items[0].address, config);
    console.log(token);
  }

  section('networks: listConfiguredNetworks() [with test nets]');
  const networks = listConfiguredNetworks({ showTestNets: true }, HARDHAT_CHAIN_ID);
  console.log(networks);
  console.log(`toNetworkListEntries(networks, ${HARDHAT_CHAIN_ID}):`, toNetworkListEntries(networks, HARDHAT_CHAIN_ID));

  section('networks: listConfiguredNetworks() [mainnets only]');
  console.log(listConfiguredNetworks({ showTestNets: false }));

  console.log('\n✓ all read paths exercised successfully');
}

main().catch((err) => {
  console.error('\n✗ verification failed:', err);
  process.exit(1);
});
