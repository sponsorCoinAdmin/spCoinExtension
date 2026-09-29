// @ts-nocheck
// File: /@sponsorcoin/spcoin-access-modules/utils/serialize.js
// const {  spCoinContractDeployed } = require("../contracts/spCoin");
// const { BigNumber, ethers, utils } = require("ethers");
import { Interface } from "ethers";
import { SpCoinLogger } from "./logging";
import { bigIntToDateTimeString, bigIntToDecString, getLocation } from "./dateTime";
import { SponsorCoinHeader, AccountStruct, StakingTransactionStruct, } from "../dataTypes/spCoinDataTypes";
import { timeOnChainCall } from "./methodTiming";
let spCoinLogger;
export const accountRewardTotalsInterface = new Interface([
    'function getAccountRewardTotals(address _accountKey) view returns (uint256 sponsorRewards, uint256 recipientRewards, uint256 agentRewards)',
]);
export const accountRecordInterface = new Interface([
    'function getAccountRecord(address _accountKey) view returns (address accountKey, uint256 creationTime, uint256 accountBalance, uint256 stakedAccountSPCoins, uint256 accountStakingRewards, uint256 sponsorCount, uint256 recipientCount, uint256 agentCount, uint256 parentRecipientCount, uint256 lastSponsorUpdateTimeStamp, uint256 lastRecipientUpdateTimeStamp, uint256 lastAgentUpdateTimeStamp)',
]);
export const accountLinksInterface = new Interface([
    'function getAccountLinks(address _accountKey) view returns (address[] sponsorKeys, address[] recipientKeys, address[] agentKeys, address[] parentRecipientKeys)',
]);
export const recipientRecordInterface = new Interface([
    'function getRecipientRecord(address _sponsorKey, address _recipientKey) view returns (address sponsorKey, address recipientKey, uint256 creationTime, uint256 stakedSPCoins, bool inserted)',
]);
export const recipientTransactionInterface = new Interface([
    'function getRecipientTransaction(address _sponsorKey, address _recipientKey, uint256 _recipientRateKey) view returns (address sponsorKey, address recipientKey, uint256 recipientRateKey, uint256 creationTime, uint256 lastUpdateTime, uint256 stakedSPCoins, bool inserted)',
]);
export const agentTransactionInterface = new Interface([
    'function getAgentTransaction(address _sponsorKey, address _recipientKey, uint256 _recipientRateKey, address _agentKey, uint256 _agentRateKey) view returns (address sponsorKey, address recipientKey, uint256 recipientRateKey, address agentKey, uint256 agentRateKey, uint256 creationTime, uint256 lastUpdateTime, uint256 stakedSPCoins, bool inserted)',
]);
export async function callViewFunction(contract, iface, functionName, args) {
    const target = String((contract === null || contract === void 0 ? void 0 : contract.target) || (typeof (contract === null || contract === void 0 ? void 0 : contract.getAddress) === 'function' ? await contract.getAddress() : ''));
    const runner = contract === null || contract === void 0 ? void 0 : contract.runner;
    if (!target || !runner || typeof runner.call !== 'function') {
        throw new Error(`${functionName} runner unavailable.`);
    }
    const data = iface.encodeFunctionData(functionName, args);
    const raw = await timeOnChainCall(functionName, () => runner.call({ to: target, data }));
    return iface.decodeFunctionResult(functionName, raw);
}
export async function readAnnualInflation(contract) {
    if (typeof (contract === null || contract === void 0 ? void 0 : contract.getInflationRate) === "function") {
        try {
            return await contract.getInflationRate();
        }
        catch (_a) {
            // Fall back for older deployments that still expose annualInflation().
        }
    }
    if (typeof (contract === null || contract === void 0 ? void 0 : contract.annualInflation) === "function") {
        try {
            return await contract.annualInflation();
        }
        catch (_b) {
            // Fall through to the historical default below.
        }
    }
    return 10;
}
export async function readInitialTotalSupply(contract) {
    if (typeof (contract === null || contract === void 0 ? void 0 : contract.totalInitialSupply) === "function") {
        try {
            return await contract.totalInitialSupply();
        }
        catch (_a) {
            // Fall back for older deployments that still expose the previous getter names.
        }
    }
    if (typeof (contract === null || contract === void 0 ? void 0 : contract.getInitialTotalSupply) === "function") {
        try {
            return await contract.getInitialTotalSupply();
        }
        catch (_b) {
            // Fall back for older deployments that still expose initialTotalSupply().
        }
    }
    if (typeof (contract === null || contract === void 0 ? void 0 : contract.initialTotalSupply) === "function") {
        return contract.initialTotalSupply();
    }
    throw new Error("SpCoin contract does not expose totalInitialSupply().");
}
export function normalizeAddress(value) {
    return String(value || '').trim().toLowerCase();
}
export function normalizeAddressList(values) {
    return values.map((value) => normalizeAddress(value)).join(',');
}
function isAccountNotFoundError(error) {
    const code = String(error?.code || '');
    const reason = String(error?.reason || error?.message?.reason || '');
    const message = String(error?.message || '');
    const revertArgs = Array.isArray(error?.revert?.args) ? error.revert.args.map((value) => String(value || '')) : [];
    return code === 'CALL_EXCEPTION' &&
        (reason === 'ACCOUNT_NOT_FOUND' ||
            message.includes('ACCOUNT_NOT_FOUND') ||
            revertArgs.includes('ACCOUNT_NOT_FOUND'));
}
function buildEmptyAccountRecord(accountKey) {
    const accountRecord = new AccountStruct();
    accountRecord.accountKey = normalizeAddress(accountKey);
    accountRecord.creationTime = '0';
    accountRecord.balanceOf = '0';
    accountRecord.stakedBalance = '0';
    accountRecord.sponsorCount = '0';
    accountRecord.recipientCount = '0';
    accountRecord.agentCount = '0';
    accountRecord.parentRecipientCount = '0';
    accountRecord.lastSponsorUpdateTimeStamp = '0';
    accountRecord.lastRecipientUpdateTimeStamp = '0';
    accountRecord.lastAgentUpdateTimeStamp = '0';
    accountRecord.sponsorKeys = [];
    accountRecord.recipientKeys = [];
    accountRecord.agentKeys = [];
    accountRecord.parentRecipientKeys = [];
    return accountRecord;
}
export async function buildSerializedAccountRecordFallback(contract, accountKey) {
    const [normalizedAccountKey, creationTime, accountBalance, stakedAccountSPCoins, accountStakingRewards, sponsorCount, recipientCount, agentCount, parentRecipientCount, lastSponsorUpdateTimeStamp, lastRecipientUpdateTimeStamp, lastAgentUpdateTimeStamp,] = await callViewFunction(contract, accountRecordInterface, 'getAccountRecord', [accountKey]);
    let sponsorKeys = [];
    let recipientKeys = [];
    let agentKeys = [];
    let parentRecipientKeys = [];
    if (BigInt(sponsorCount) > 0n || BigInt(recipientCount) > 0n || BigInt(agentCount) > 0n || BigInt(parentRecipientCount) > 0n) {
        [sponsorKeys, recipientKeys, agentKeys, parentRecipientKeys] = await callViewFunction(contract, accountLinksInterface, 'getAccountLinks', [accountKey]);
    }
    const accountRecord = new AccountStruct();
    accountRecord.accountKey = normalizeAddress(normalizedAccountKey);
    accountRecord.creationTime = String(creationTime).trim() === "0" ? "" : bigIntToDateTimeString(creationTime);
    accountRecord.balanceOf = bigIntToDecString(accountBalance);
    accountRecord.stakedBalance = bigIntToDecString(stakedAccountSPCoins);
    accountRecord.stakingRewards = bigIntToDecString(accountStakingRewards);
    accountRecord.sponsorCount = String(sponsorCount);
    accountRecord.recipientCount = String(recipientCount);
    accountRecord.agentCount = String(agentCount);
    accountRecord.parentRecipientCount = String(parentRecipientCount);
    accountRecord.lastSponsorUpdateTimeStamp = String(lastSponsorUpdateTimeStamp ?? '0');
    accountRecord.lastRecipientUpdateTimeStamp = String(lastRecipientUpdateTimeStamp ?? '0');
    accountRecord.lastAgentUpdateTimeStamp = String(lastAgentUpdateTimeStamp ?? '0');
    accountRecord.sponsorKeys = Array.from(sponsorKeys || []).map(normalizeAddress);
    accountRecord.recipientKeys = Array.from(recipientKeys || []).map(normalizeAddress);
    accountRecord.agentKeys = Array.from(agentKeys || []).map(normalizeAddress);
    accountRecord.parentRecipientKeys = Array.from(parentRecipientKeys || []).map(normalizeAddress);
    return accountRecord;
}
export async function buildSerializedAccountRewardsFallback(contract, accountKey) {
    const [sponsorRewards, recipientRewards, agentRewards] = await callViewFunction(contract, accountRewardTotalsInterface, 'getAccountRewardTotals', [accountKey]);
    return {
        sponsorRewards: String(sponsorRewards),
        recipientRewards: String(recipientRewards),
        agentRewards: String(agentRewards),
    };
}
export async function buildSerializedRecipientRecordFallback(contract, sponsorKey, recipientKey) {
    const [resolvedSponsorKey, resolvedRecipientKey, creationTime, stakedSPCoins, inserted] = await callViewFunction(contract, recipientRecordInterface, 'getRecipientRecord', [sponsorKey, recipientKey]);
    return {
        sponsorKey: normalizeAddress(resolvedSponsorKey),
        recipientKey: normalizeAddress(resolvedRecipientKey),
        creationTime: String(creationTime),
        stakedSPCoins: String(stakedSPCoins),
        inserted: Boolean(inserted),
    };
}
export async function buildSerializedRecipientRateFallback(contract, sponsorKey, recipientKey, recipientRateKey) {
    const [resolvedSponsorKey, resolvedRecipientKey, resolvedRecipientRateKey, creationTime, lastUpdateTime, stakedSPCoins, inserted] = await callViewFunction(contract, recipientTransactionInterface, 'getRecipientTransaction', [sponsorKey, recipientKey, recipientRateKey]);
    return {
        sponsorKey: normalizeAddress(resolvedSponsorKey),
        recipientKey: normalizeAddress(resolvedRecipientKey),
        recipientRateKey: String(resolvedRecipientRateKey),
        creationTime: String(creationTime),
        lastUpdateTime: String(lastUpdateTime),
        stakedSPCoins: String(stakedSPCoins),
        inserted: Boolean(inserted),
    };
}
export async function buildSerializedAgentRateFallback(contract, sponsorKey, recipientKey, recipientRateKey, agentKey, agentRateKey) {
    const [resolvedSponsorKey, resolvedRecipientKey, resolvedRecipientRateKey, resolvedAgentKey, resolvedAgentRateKey, creationTime, lastUpdateTime, stakedSPCoins, inserted] = await callViewFunction(contract, agentTransactionInterface, 'getAgentTransaction', [sponsorKey, recipientKey, recipientRateKey, agentKey, agentRateKey]);
    return {
        sponsorKey: normalizeAddress(resolvedSponsorKey),
        recipientKey: normalizeAddress(resolvedRecipientKey),
        recipientRateKey: String(resolvedRecipientRateKey),
        agentKey: normalizeAddress(resolvedAgentKey),
        agentRateKey: String(resolvedAgentRateKey),
        creationTime: String(creationTime),
        lastUpdateTime: String(lastUpdateTime),
        stakedSPCoins: String(stakedSPCoins),
        inserted: Boolean(inserted),
    };
}
export class SpCoinSerialize {
    constructor(_spCoinContractDeployed) {
        this.setContract = (_spCoinContractDeployed) => {
            this.spCoinContractDeployed = _spCoinContractDeployed;
        };
        //////////////////////////////////////////////////////////////////////////////////////////////////////
        this.getRecipientTransactionFields = async (_sponsorKey, _recipientKey, _recipientRateKey) => {
            spCoinLogger.logFunctionHeader("getRecipientTransactionFields = async(" + _sponsorKey + _recipientKey + ", " + _recipientRateKey + ")");
            const recipientTransaction = await buildSerializedRecipientRateFallback(this.spCoinContractDeployed, _sponsorKey, _recipientKey, _recipientRateKey);
            const recipientRateList = [
                recipientTransaction.creationTime,
                recipientTransaction.lastUpdateTime,
                recipientTransaction.stakedSPCoins,
            ];
            spCoinLogger.logExitFunction();
            return recipientRateList;
        };
        this.getRecipientRecordFields = async (_sponsorKey, _recipientKey) => {
            spCoinLogger.logFunctionHeader("getRecipientRecordFields = async(" + _sponsorKey + ", " + _recipientKey + ", " + ")");
            const recipientRecord = await buildSerializedRecipientRecordFallback(this.spCoinContractDeployed, _sponsorKey, _recipientKey);
            const recipientRecordList = [
                recipientRecord.creationTime,
                recipientRecord.stakedSPCoins,
            ];
            spCoinLogger.logExitFunction();
            return recipientRecordList;
        };
        this.getAgentTransactionFields = async (_sponsorKey, _recipientKey, _recipientRateKey, _agentKey, _agentRateKey) => {
            spCoinLogger.logFunctionHeader("getAgentTransactionFields = async(" + _sponsorKey + ", " + _recipientKey + ", " + _agentKey + ", " + _agentRateKey + ")");
            const agentTransaction = await buildSerializedAgentRateFallback(this.spCoinContractDeployed, _sponsorKey, _recipientKey, _recipientRateKey, _agentKey, _agentRateKey);
            const agentTransactionFields = [
                agentTransaction.creationTime,
                agentTransaction.lastUpdateTime,
                agentTransaction.stakedSPCoins,
            ];
            spCoinLogger.logExitFunction();
            return agentTransactionFields;
        };
        this.getAccountRecordObject = async (_accountKey) => {
            spCoinLogger.logFunctionHeader("getAccountRecordObject = async(" + _accountKey + ")");
            try {
                return await buildSerializedAccountRecordFallback(this.spCoinContractDeployed, _accountKey);
            }
            catch (_error) {
                if (!isAccountNotFoundError(_error)) {
                    throw _error;
                }
                spCoinLogger.logExitFunction();
                return buildEmptyAccountRecord(_accountKey);
            }
        };
        this.getAccountRewardsValue = async (_accountKey) => {
            spCoinLogger.logFunctionHeader("getAccountRewardsValue = async(" + _accountKey + ")");
            try {
                return await buildSerializedAccountRewardsFallback(this.spCoinContractDeployed, _accountKey);
            }
            catch (_error) {
                if (!isAccountNotFoundError(_error)) {
                    throw _error;
                }
                return {
                    sponsorRewards: "0",
                    recipientRewards: "0",
                    agentRewards: "0",
                };
            }
        };
        this.mapTransactionRecords = (transactions) => {
            spCoinLogger.logFunctionHeader("mapTransactionRecords()");
            const transactionRecs = [];
            if (Array.isArray(transactions) && transactions.length > 0) {
                for (let row = transactions.length - 1; row >= 0; row--) {
                    const transactionFields = transactions[row];
                    const transactionRec = new StakingTransactionStruct();
                    transactionRec.location = getLocation();
                    transactionRec.insertionTime = bigIntToDateTimeString(transactionFields.insertionTime ?? transactionFields[0]);
                    transactionRec.quantity = bigIntToDecString(transactionFields.stakingRewards ?? transactionFields[1]);
                    transactionRecs.push(transactionRec);
                }
                spCoinLogger.logExitFunction();
            }
            return transactionRecs;
        };
        this.deserializeTransactionRecords = (transactionStr) => {
            const transactionRows = String(transactionStr || "")
                .split("\n")
                .filter(Boolean)
                .map((row) => {
                const [insertionTime, stakingRewards] = row.split(",");
                return { insertionTime, stakingRewards };
            });
            return this.mapTransactionRecords(transactionRows);
        };
        this.getSPCoinHeaderObject = async () => {
            // console.log("JS==>1 deserializedSPCoinHeader()");
            spCoinLogger.logFunctionHeader("getSPCoinHeaderObject()");
            const sponsorCoinHeader = new SponsorCoinHeader();
            const versionReader = typeof this.spCoinContractDeployed.version === "function"
                ? this.spCoinContractDeployed.version.bind(this.spCoinContractDeployed)
                : typeof this.spCoinContractDeployed.getVersion === "function"
                    ? this.spCoinContractDeployed.getVersion.bind(this.spCoinContractDeployed)
                    : this.spCoinContractDeployed.version.bind(this.spCoinContractDeployed);
            const [name, creationTime, decimals, totalSupply, initialTotalSupply, annualInflation, totalUnstakedSpCoins, totalStakingRewards, totalStakedSPCoins, symbol, version] = await Promise.all([
                this.spCoinContractDeployed.name(),
                this.spCoinContractDeployed.creationTime(),
                this.spCoinContractDeployed.decimals(),
                this.spCoinContractDeployed.totalSupply(),
                readInitialTotalSupply(this.spCoinContractDeployed),
                readAnnualInflation(this.spCoinContractDeployed),
                this.spCoinContractDeployed.totalUnstakedSpCoins(),
                this.spCoinContractDeployed.totalStakingRewards(),
                this.spCoinContractDeployed.totalStakedSPCoins(),
                this.spCoinContractDeployed.symbol(),
                versionReader(),
            ]);
            sponsorCoinHeader.name = String(name);
            sponsorCoinHeader.symbol = String(symbol);
            sponsorCoinHeader.version = String(version);
            sponsorCoinHeader.decimals = bigIntToDecString(decimals);
            sponsorCoinHeader.totalSupply = bigIntToDecString(totalSupply);
            sponsorCoinHeader.totalUnstakedSpCoins = bigIntToDecString(totalUnstakedSpCoins);
            sponsorCoinHeader.initialTotalSupply = bigIntToDecString(initialTotalSupply);
            sponsorCoinHeader.annualInflation = bigIntToDecString(annualInflation);
            sponsorCoinHeader.creationTime = bigIntToDateTimeString(creationTime);
            sponsorCoinHeader.totalStakedSPCoins = bigIntToDecString(totalStakedSPCoins);
            sponsorCoinHeader.totalStakingRewards = bigIntToDecString(totalStakingRewards);
            return sponsorCoinHeader;
        };
        this.getSerializedRecipientRateList = async (_sponsorKey, _recipientKey, _recipientRateKey) => this.getRecipientTransactionFields(_sponsorKey, _recipientKey, _recipientRateKey);
        this.getSerializedRecipientRecordList = async (_sponsorKey, _recipientKey) => this.getRecipientRecordFields(_sponsorKey, _recipientKey);
        this.getSerializedAgentRateList = async (_sponsorKey, _recipientKey, _recipientRateKey, _agentKey, _agentRateKey) => this.getAgentTransactionFields(_sponsorKey, _recipientKey, _recipientRateKey, _agentKey, _agentRateKey);
        this.getSerializedAccountRecord = async (_accountKey) => this.getAccountRecordObject(_accountKey);
        this.getSerializedAccountRewards = async (_accountKey) => this.getAccountRewardsValue(_accountKey);
        this.deserializedSPCoinHeader = async () => this.getSPCoinHeaderObject();
        if (_spCoinContractDeployed != undefined) {
            this.spCoinContractDeployed = _spCoinContractDeployed;
            spCoinLogger = new SpCoinLogger(_spCoinContractDeployed);
        }
    }
}
