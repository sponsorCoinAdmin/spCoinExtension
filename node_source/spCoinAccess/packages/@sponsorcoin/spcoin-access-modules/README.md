# spcoin-access-modules

Package to interface with Sponsor Coin (`SPCoin`) using a split processing model:

- `onChain`
  Handles blockchain-facing reads and writes.
- `offChain`
  Handles local processing, serialization, logging, and data shaping.

`offChain` helpers may compose `onChain` methods when they need live contract data, but their primary responsibility is still off-chain processing.

## Exports

- Root package: `@sponsorcoin/spcoin-access-modules`
- On-chain processor: `@sponsorcoin/spcoin-access-modules/onChain`
- Off-chain processor: `@sponsorcoin/spcoin-access-modules/offChain`

## On-Chain

Use the on-chain processor for direct contract interaction:

- add methods
- delete methods
- ERC-20 methods
- read methods
- rewards methods
- staking methods

Example:

```js
const { SpCoinOnChainProcessor } = require('@sponsorcoin/spcoin-access-modules/onChain');

const onChain = new SpCoinOnChainProcessor(spCoinABI, spCoinAddress, signer);
const methods = onChain.methods();

await methods.add.addRecipient(recipientKey);
const accountList = await methods.read.getAccountList();
```

## Off-Chain

Use the off-chain processor for local transformation and support logic:

- serialize helpers
- logger helpers
- date/time helpers
- data type constructors
- tree/structure printers
- convenience orchestration such as:
  - `addRecipients`
  - `addAgents`
  - `setLowerRecipientRate`
  - `setUpperRecipientRate`
  - `setLowerAgentRate`
  - `setUpperAgentRate`

Example:

```js
const { SpCoinOnChainProcessor } = require('@sponsorcoin/spcoin-access-modules/onChain');
const { SpCoinOffChainProcessor } = require('@sponsorcoin/spcoin-access-modules/offChain');

const onChain = new SpCoinOnChainProcessor(spCoinABI, spCoinAddress, signer);
const offChain = new SpCoinOffChainProcessor(onChain);
const methods = offChain.methods();

const serialized = await methods.serialize.getSerializedAccountRecord(accountKey);
methods.logger.logJSONStr('Serialized account', serialized);
```

## Backward Compatibility

The legacy root export still works:

```js
const { SpCoinAccessModules } = require('@sponsorcoin/spcoin-access-modules');
```

It now also exposes:

- `spCoinOnChainMethods`
- `spCoinOffChainMethods`

This allows gradual migration without breaking existing callers.
