import * as addMethods from "./methods";
import type {
  SpCoinAddBoundMethod,
  SpCoinAddMethod,
  SpCoinAddModuleContext,
} from "./types";

export function bindAddMethods(context: SpCoinAddModuleContext): void {
  const methodEntries = Object.entries(addMethods) as [string, SpCoinAddMethod][];

  for (const [name, method] of methodEntries) {
    context[name] = ((...args: unknown[]) => method(context, ...args)) as SpCoinAddBoundMethod;
  }
}

