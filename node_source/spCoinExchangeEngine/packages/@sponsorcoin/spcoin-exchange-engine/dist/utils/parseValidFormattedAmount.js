// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/utils/parseValidFormattedAmount.ts
// 2026-09-25, migrated from spcoin-nextjs-front-end's lib/spCoin/coreUtils.ts
// (on request, "migrate useGetBalance/parseValidFormattedAmount"). Pure
// function, byte-identical move — previously blocked by this package's
// module config (node16 resolution flagged viem's formatUnits, TS1479);
// unblocked by the tsconfig.json/package.json ESM/bundler-resolution
// switch this same pass (see that config's own header comment).
import { formatUnits } from 'viem';
export const parseValidFormattedAmount = (value, decimals) => {
    decimals = decimals ?? 0;
    let price;
    if (typeof value === 'string') {
        price = value.startsWith('.') ? '0' + value : value;
    }
    else {
        price = formatUnits(value ?? 0n, decimals);
    }
    // Accepts "", "0", "0.", ".1", "2.000", etc.
    const re = /^\d*(?:[.,]\d*)?$/;
    if (price === '' || re.test(price)) {
        const [intPart, decimalPart] = price.replace(',', '.').split('.');
        let formattedValue = (intPart || '0').replace(/^0+/, '') || '0';
        if (decimalPart !== undefined) {
            // ✅ Preserve trailing zeros
            formattedValue += '.' + decimalPart;
        }
        else if (price.endsWith('.')) {
            // ✅ Preserve the trailing decimal
            formattedValue += '.';
        }
        return formattedValue;
    }
    return '0';
};
