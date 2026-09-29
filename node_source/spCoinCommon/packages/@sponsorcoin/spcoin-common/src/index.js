"use strict";
// File: spCoinCommon/src/index.ts
//
// Root barrel (the package's "." export) — re-exports all subpaths.
// Most consumers should prefer importing from the specific subpath
// (`@sponsorcoin/spcoin-common/context`, `/panels`, or `/styles`) for
// clarity about which slice of this package they depend on; this root
// export exists for convenience and for `main`/`types` fallback
// resolution.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./context"), exports);
__exportStar(require("./panels"), exports);
__exportStar(require("./appType"), exports);
__exportStar(require("./styles"), exports);
__exportStar(require("./tradeExecutor"), exports);
