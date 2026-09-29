// @ts-nocheck
// File: /@sponsorcoin/spcoin-access-modules/index.js
import * as ethers_1 from "ethers";
import * as logging_1 from "./utils/logging";
import * as onChain_1 from "./onChain";
import * as offChain_1 from "./offChain";
import * as spCoinERC20Module_1 from "./modules/spCoinERC20Module/index";
import * as spCoinDeleteModule_1 from "./modules/spCoinDeleteModule/index";
import * as spCoinAddModule_1 from "./modules/spCoinAddModule/index";
import * as spCoinReadModule_1 from "./modules/spCoinReadModule/index";
import * as spCoinRewardsModule_1 from "./modules/spCoinRewardsModule/index";
import * as spCoinStakingModule_1 from "./modules/spCoinStakingModule/index";
export { SpCoinLogger as SpCoinLogger } from "./utils/logging";
export { SpCoinOnChainProcessor as SpCoinOnChainProcessor } from "./onChain";
export { SpCoinOffChainProcessor as SpCoinOffChainProcessor } from "./offChain";
export { SpCoinERC20Module as SpCoinERC20Module } from "./modules/spCoinERC20Module/index";
export { SpCoinDeleteModule as SpCoinDeleteModule } from "./modules/spCoinDeleteModule/index";
export { SpCoinAddModule as SpCoinAddModule } from "./modules/spCoinAddModule/index";
export { SpCoinReadModule as SpCoinReadModule } from "./modules/spCoinReadModule/index";
export { SpCoinRewardsModule as SpCoinRewardsModule } from "./modules/spCoinRewardsModule/index";
export { SpCoinStakingModule as SpCoinStakingModule } from "./modules/spCoinStakingModule/index";
export { callAccessMethod } from "./utils/callAccessMethod";
// 2026-09-29, library isolation audit — readCache.ts/readCacheTtl.ts no
// longer read process.env.NEXT_PUBLIC_* directly (a Next.js-specific
// build-time convention this package has no business assuming); the web
// app's own bootstrap should call these once with its real process.env
// reads to restore its existing cache-TTL-tuning behavior. Not yet wired
// (same deferred status as every other injection point added this pass —
// see docs/migrationTodo.txt's own 2026-09-29 entry).
export { configureDefaultReadCacheTtlEnv } from "./utils/readCache";
export { configureReadCacheTtlEnv } from "./utils/readCacheTtl";
export type {
    AccessMethodCaller,
    AccessMethodCallOptions,
    AccessMethodLifecycle,
    AccessMethodRunner,
    AccessMethodRunState,
} from "./utils/callAccessMethod";
export class SpCoinAccessModules {
    constructor(spCoinABI, spCoinAddress, signer) {
        this.methods = () => {
            return {
                spCoinContractDeployed: this.spCoinContractDeployed,
                spCoinAddMethods: this.spCoinAddMethods,
                spCoinDeleteMethods: this.spCoinDeleteMethods,
                spCoinERC20Methods: this.spCoinERC20Methods,
                spCoinLogger: this.spCoinLogger,
                spCoinOnChainMethods: this.spCoinOnChainMethods,
                spCoinOffChainMethods: this.spCoinOffChainMethods,
                spCoinReadMethods: this.spCoinReadMethods,
                spCoinRewardsMethods: this.spCoinRewardsMethods,
                spCoinStakingMethods: this.spCoinStakingMethods
            };
        };
        // console.debug(`SpCoinAccessModules.constructor.spCoinAddress = ${spCoinAddress}`)
        // console.debug(`SpCoinAccessModules.constructor.spCoinABI = ${JSON.stringify(spCoinABI,null,2)}`)
        console.debug(`SpCoinAccessModules.constructor.signer = ${JSON.stringify(signer, null, 2)}`);
        const signedContract = new ethers_1.ethers.Contract(spCoinAddress, spCoinABI, signer);
        this.spCoinContractDeployed = signedContract;
        this.spCoinOnChainMethods = new onChain_1.SpCoinOnChainProcessor(spCoinABI, spCoinAddress, signer);
        this.spCoinOffChainMethods = new offChain_1.SpCoinOffChainProcessor(this.spCoinOnChainMethods);
        // console.debug(`SpCoinAccessModules.constructor.signedContract = ${JSON.stringify(signedContract,null,2)}`)
        this.spCoinAddMethods = new spCoinAddModule_1.SpCoinAddModule(this.spCoinContractDeployed);
        this.spCoinDeleteMethods = new spCoinDeleteModule_1.SpCoinDeleteModule(this.spCoinContractDeployed);
        this.spCoinERC20Methods = new spCoinERC20Module_1.SpCoinERC20Module(this.spCoinContractDeployed);
        this.spCoinLogger = new logging_1.SpCoinLogger(this.spCoinContractDeployed);
        this.spCoinReadMethods = new spCoinReadModule_1.SpCoinReadModule(this.spCoinContractDeployed);
        this.spCoinRewardsMethods = new spCoinRewardsModule_1.SpCoinRewardsModule(this.spCoinContractDeployed);
        this.spCoinStakingMethods = new spCoinStakingModule_1.SpCoinStakingModule(this.spCoinContractDeployed);
    }
}
