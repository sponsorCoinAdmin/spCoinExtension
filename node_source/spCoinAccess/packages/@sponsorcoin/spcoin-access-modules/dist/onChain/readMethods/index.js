// @ts-nocheck
import getInflationRate from './getInflationRate';
import calculateStakingRewards from './calculateStakingRewards';
import getAccountKeys from './getMasterAccountList';
import getMasterAccountMetaData from './getMasterAccountMetaData';
import getActiveAccountKeys from './getActiveAccountList';
import getAccountRecord from './getAccountRecord';
import getAccountRewardUpdateTimestamps from './getAccountRewardUpdateTimestamps';
import getRecipientRateKeys from './getRecipientRateList';
import getRecipientRateAgentKeys from './getRecipientRateAgentList';
import getLowerRecipientRate from './getLowerRecipientRate';
import getUpperRecipientRate from './getUpperRecipientRate';
import getRecipientRateRange from './getRecipientRateRange';
import getRecipientRateIncrement from './getRecipientRateIncrement';
import getAgentRateKeys from './getAgentRateList';
import getLowerAgentRate from './getLowerAgentRate';
import getUpperAgentRate from './getUpperAgentRate';
import getAgentRateRange from './getAgentRateRange';
import getAgentRateIncrement from './getAgentRateIncrement';
import getDefaultRecipientRate from './getDefaultRecipientRate';
import getDefaultAgentRate from './getDefaultAgentRate';
import totalInitialSupply from './getInitialTotalSupply';
import isDeployed from './isDeployed';
import isAccountInserted from './isAccountInserted';
import getAccountElement from './getMasterAccountElement';
import getActiveAccountElement from './getActiveAccountElement';
import getStakingRewards from './getStakingRewards';
import getAccountTimeInSecondeSinceUpdate from './getAccountTimeInSecondeSinceUpdate';
import totalUnstakedSpCoins from './totalUnstakedSpCoins';
import totalStakedSPCoins from './totalStakedSPCoins';
import totalStakingRewards from './totalStakingRewards';
import getVersion from './getVersion';
import getTransactionRecord from './getTransactionRecord';
import getRecipientTransactionIdKeys from './getRecipientTransactionIdKeys';
import getAgentTransactionIdKeys from './getAgentTransactionIdKeys';
import getMasterAccountKeyCount from './getAccountListSize';
import getActiveAccountCount from './getActiveAccountListSize';
import getSponsorKeys from './getSponsorKeys';
import getParentRecipientKeys from './getParentRecipientKeys';
import getAccountLinks from './getAccountLinks';
import getRecipientKeys from './getAccountRecipientList';
import getAgentKeys from './getAccountAgentList';
import getRecipientKeyCount from './getAccountRecipientListSize';
import getAgentKeyCount from './getAgentListSize';
import getRecipientTransactionList from './getRecipientTransactionList';
import getRecipientRecordList from './getRecipientRecordList';
import getAgentTransactionList from './getAgentTransactionList';
import getRecipientTransactionCount from './getRecipientTransactionCount';
import getAgentTransactionCount from './getAgentTransactionCount';
import getRecipientTransactionAt from './getRecipientTransactionAt';
import getAgentTransactionAt from './getAgentTransactionAt';
import getAgent from './getAgent';
import getAgentRecordList from './getAgentRecordList';
import getCreationTime from './getCreationTime';
import getSpCoinMetaData from './getSpCoinMetaData';
import getSerializedSPCoinHeader from './getSerializedSPCoinHeader';
import getSerializedAccountRecord from './getSerializedAccountRecord';
import getSerializedAccountRewards from './getSerializedAccountRewards';
import getSerializedRecipientRecordList from './getSerializedRecipientRecordList';
import getSerializedRecipientRateList from './getSerializedRecipientRateList';
import serializedRecipientRateTransactionStr from './serializedRecipientRateTransactionStr';
import serializedAgentTransactionStr from './serializedAgentTransactionStr';
import serializedAgentRateTransactionStr from './serializedAgentRateTransactionStr';
import getSerializedTransactionList from './getSerializedTransactionList';
import getSponsorTree from './getSponsorTree';
export const ONCHAIN_READ_METHOD_HANDLERS = {
    getSponsorTree,
    getInflationRate,
    calculateStakingRewards,
    getMasterAccountMetaData,
    getMasterAccountKeys: getAccountKeys,
    getAccountKeys,
    getAccountRecord,
    getAccountRewardUpdateTimestamps,
    getActiveAccountKeys,
    getRecipientRateKeys,
    getSponsorRecipientRates: getRecipientRateKeys,
    getSponsorRecipientRateKeys: getRecipientRateKeys,
    getRecipientRateAgentKeys,
    getLowerRecipientRate,
    getUpperRecipientRate,
    getRecipientRateRange,
    getRecipientRateIncrement,
    getAgentRateKeys,
    getLowerAgentRate,
    getUpperAgentRate,
    getAgentRateRange,
    getAgentRateIncrement,
    getDefaultRecipientRate,
    getDefaultAgentRate,
    totalInitialSupply,
    isDeployed,
    isAccountInserted,
    getMasterAccountElement: getAccountElement,
    getAccountElement,
    getActiveAccountKeyAt: getActiveAccountElement,
    getStakingRewards,
    getAccountTimeInSecondeSinceUpdate,
    totalUnstakedSpCoins,
    totalStakedSPCoins,
    totalStakingRewards,
    version: getVersion,
    getVersion,
    getTransactionRecord,
    getRecipientTransactionIdKeys,
    getAgentTransactionIdKeys,
    getMasterAccountKeyCount,
    getMasterAccountCount: getMasterAccountKeyCount,
    getAccountKeyCount: getMasterAccountKeyCount,
    getActiveAccountCount,
    getSponsorKeys,
    getParentRecipientKeys,
    getAccountLinks,
    getRecipientKeys,
    getAgentKeys,
    getRecipientKeyCount,
    getAgentKeyCount,
    getAccountAgentCount: getAgentKeyCount,
    getRecipientTransactionList,
    getRecipientRecordList,
    getAgentTransactionList,
    getRecipientTransactionCount,
    getAgentTransactionCount,
    getRecipientTransactionAt,
    getAgentTransactionAt,
    getAgent,
    getAgentRecordList,
    getCreationTime,
    getSpCoinMetaData,
    getSerializedSPCoinHeader,
    getSerializedAccountRecord,
    getSerializedAccountRewards,
    getSerializedRecipientRecordList,
    getSerializedRecipientRateList,
    serializedRecipientRateTransactionStr,
    serializedAgentTransactionStr,
    serializedAgentRateTransactionStr,
    getSerializedTransactionList,
    getMasterAccountList: getAccountKeys,
    getActiveAccountList: getActiveAccountKeys,
    getMasterAccountKeyAt: getAccountElement,
    getAccountKeyAt: getAccountElement,
    getActiveAccountElement,
    getMasterAccountListSize: getMasterAccountKeyCount,
    getActiveAccountListSize: getActiveAccountCount,
    getRecipientList: getRecipientKeys,
    getAgentList: getAgentKeys,
    getRecipientListSize: getRecipientKeyCount,
    getAgentListSize: getAgentKeyCount,
    getRecipientRateList: getRecipientRateKeys,
    getRecipientRateAgentList: getRecipientRateAgentKeys,
    getAgentRateList: getAgentRateKeys,
    creationTime: getCreationTime,
};
