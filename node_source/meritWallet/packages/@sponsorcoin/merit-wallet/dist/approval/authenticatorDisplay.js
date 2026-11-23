export function authenticatorDisplayOf(display) {
    return {
        title: display?.title ?? display?.label ?? 'Transaction',
        message: display?.label,
        contractAddress: display?.contractAddress,
        contractSymbol: display?.contractSymbol,
        contractName: display?.contractName,
        swapMethod: display?.swapMethod,
        swapStep: display?.swapStep,
        method: display?.method,
        accounts: display?.accounts,
        tokens: display?.tokens,
        amount: display?.amount ? { label: display.amount.label, value: display.amount.value } : undefined,
        amounts: display?.amounts,
        pills: display?.pills,
    };
}
