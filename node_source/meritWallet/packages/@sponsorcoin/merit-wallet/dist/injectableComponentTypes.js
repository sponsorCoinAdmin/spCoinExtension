// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/injectableComponentTypes.ts
//
// 2026-10-18 (docs/appPackages.txt, item 2) -- shared TypeScript interfaces for the injectable components that app packages
// supply to meritWallet via the host contract. meritWallet consumes these through the host; app packages implement them.
// Each app package provides exactly the components its platform uses:
//   - meritWebApp  -> KeyStore  (profile/account storage, keystore management, avatar handling)
//   - meritExtension -> Vault  (secure key/account management, Chrome runtime/messaging)
//   - meritAndroid -> Android Keystore + biometric hooks
//   - meritIphone  -> Keychain + Secure Enclave hooks
//
// Pure TypeScript: no React, no DOM, no browser globals. Implementations live in the app packages.
export {};
