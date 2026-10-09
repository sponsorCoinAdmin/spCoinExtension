// File: src/spCoinStakeAbi.ts
// Split out of executeStakeTransaction.ts (2026-10-08) so runSpCoinReadStep.ts can use it without an import cycle.
//
// 2026-10-09: corrected to the deployed contracts' real signatures (public/assets/ABIs/spCoin/V_0.json and V_99.json in the web repo). The stake methods take
// address / uint256 arguments; this slice had declared them as strings, so a stake against the real chain called a function that does not exist. The slice also
// carries the sponsor views and the unstake writes the Rewards / Sponsor screens need, so those reads go straight to the chain's RPC (createDirectReadStep)
// and the unstake transactions are encoded here, with no hosted app and no ethers.
import type { Abi } from 'viem';
import { parseAbi } from 'viem';

export const SPOIN_STAKE_ABI = parseAbi([
  // stake
  'function sponsorAgentTransaction(address _recipientKey, uint256 _recipientRateKey, address _agentKey, uint256 _agentRateKey, uint256 _amount) external',
  'function sponsorRecipientTransaction(address _recipientKey, uint256 _recipientRateKey, uint256 _amount) external',
  // unstake (each is its own transaction; _quantity 0 means "all")
  'function unSponsorRecipient(address _sponsorKey, address _recipientKey) external',
  'function deleteRecipientRate(address _sponsorKey, address _recipientKey, uint256 _recipientRateKey, uint256 _quantity) external',
  'function unSponsorAgent(address _sponsorKey, address _recipientKey, uint256 _recipientRateKey, address _agentKey) external',
  'function deleteAgentRate(address _sponsorKey, address _recipientKey, uint256 _recipientRateKey, address _agentKey, uint256 _agentRateKey, uint256 _quantity) external',
  // views
  'function getAccountRecord(address _accountKey) view returns (address accountKey, uint256 creationTime, uint256 accountBalance, uint256 stakedAccountSPCoins, uint256 accountStakingRewards, uint256 sponsorCount, uint256 recipientCount, uint256 agentCount, uint256 parentRecipientCount, uint256 lastSponsorUpdateTimeStamp, uint256 lastRecipientUpdateTimeStamp, uint256 lastAgentUpdateTimeStamp)',
  'function getRecipientRateIncrement() view returns (uint256)',
  'function getAgentRateIncrement() view returns (uint256)',
  'function getRecipientRateRange() view returns (uint256, uint256)',
  'function getAgentRateRange() view returns (uint256, uint256)',
  'function getRecipientKeys(address _sponsorKey) view returns (address[])',
  'function getSponsorRecipientRates(address _sponsorKey, address _recipientKey) view returns (uint256[])',
  'function getRecipientRateAgentList(address _sponsorKey, address _recipientKey, uint256 _recipientRateKey) view returns (address[])',
  'function getAgentRateList(address _sponsorKey, address _recipientKey, uint256 _recipientRateKey, address _agentKey) view returns (uint256[])',
  // the views the client-side reward estimate walks (2026-10-09, row 25)
  'function getInflationRate() view returns (uint256)',
  'function getSponsorKeys(address _accountKey) view returns (address[])',
  'function getParentRecipientKeys(address _accountKey) view returns (address[])',
  'function getRecipientRateTransactionSetKey(address _sponsorKey, address _recipientKey, uint256 _recipientRateKey) view returns (bytes32)',
  'function getAgentRateTransactionSetKey(address _sponsorKey, address _recipientKey, uint256 _recipientRateKey, address _agentKey, uint256 _agentRateKey) view returns (bytes32)',
  'function getRateTransactionSet(bytes32 _setKey) view returns (bytes32 setKey, uint256 rate, uint256 creationTimeStamp, uint256 rewardsSettledThroughTimeStamp, uint256 totalStaked, uint256 transactionCount, bool inserted)',
  'function getRecipientTransaction(address _sponsorKey, address _recipientKey, uint256 _recipientRateKey) view returns (address sponsorKey, address recipientKey, uint256 recipientRateKey, uint256 creationTime, uint256 lastUpdateTime, uint256 stakedSPCoins, bool inserted)',
  'function getAgentTransaction(address _sponsorKey, address _recipientKey, uint256 _recipientRateKey, address _agentKey, uint256 _agentRateKey) view returns (address sponsorKey, address recipientKey, uint256 recipientRateKey, address agentKey, uint256 agentRateKey, uint256 creationTime, uint256 lastUpdateTime, uint256 stakedSPCoins, bool inserted)',
]) as Abi;
