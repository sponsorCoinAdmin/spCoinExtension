// @ts-nocheck
import * as rewardsMethods from "./methods";
export function bindRewardsMethods(context) {
    const boundMethods = context;
    const methodEntries = Object.entries(rewardsMethods);
    for (const [name, method] of methodEntries) {
        boundMethods[name] = (...args) => method(context, ...args);
    }
}

