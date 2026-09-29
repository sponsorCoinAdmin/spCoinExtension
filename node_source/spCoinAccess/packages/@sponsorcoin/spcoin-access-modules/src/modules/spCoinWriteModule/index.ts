// @ts-nocheck
import { SpCoinAddModule } from "../spCoinAddModule/index";
import { SpCoinDeleteModule } from "../spCoinDeleteModule/index";
import { SpCoinRewardsModule } from "../spCoinRewardsModule/index";
import { SpCoinStakingModule } from "../spCoinStakingModule/index";

export class SpCoinWriteModule {
    constructor(_spCoinContractDeployed) {
        this.spCoinContractDeployed = _spCoinContractDeployed;
        this.add = new SpCoinAddModule(_spCoinContractDeployed);
        this.delete = new SpCoinDeleteModule(_spCoinContractDeployed);
        this.rewards = new SpCoinRewardsModule(_spCoinContractDeployed);
        this.staking = new SpCoinStakingModule(_spCoinContractDeployed);
        this.bindModuleMethods(this.add);
        this.bindModuleMethods(this.delete);
        this.bindModuleMethods(this.rewards);
        this.bindModuleMethods(this.staking);
    }

    bindModuleMethods(moduleValue) {
        for (const [name, value] of Object.entries(moduleValue)) {
            if (typeof value === "function" && !name.startsWith("bind")) {
                this[name] = value.bind(moduleValue);
            }
        }
    }
}
