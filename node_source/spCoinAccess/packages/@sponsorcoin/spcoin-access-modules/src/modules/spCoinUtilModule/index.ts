// @ts-nocheck
import { SpCoinLogger } from "../../utils/logging";
import { SpCoinSerialize } from "../../utils/serialize";
import * as dateTime from "../../utils/dateTime";
import * as dataTypes from "../../dataTypes/spCoinDataTypes";
import * as printTreeStructures from "../../utils/printTreeStructures";

export class SpCoinUtilModule {
    constructor(_spCoinContractDeployed) {
        this.spCoinContractDeployed = _spCoinContractDeployed;
        this.logger = new SpCoinLogger(_spCoinContractDeployed);
        this.serialize = new SpCoinSerialize(_spCoinContractDeployed);
        this.dateTime = dateTime;
        this.dataTypes = dataTypes;
        this.printTreeStructures = printTreeStructures;
    }

    methods() {
        return {
            contract: this.spCoinContractDeployed,
            logger: this.logger,
            serialize: this.serialize,
            dateTime: this.dateTime,
            dataTypes: this.dataTypes,
            printTreeStructures: this.printTreeStructures,
        };
    }
}
