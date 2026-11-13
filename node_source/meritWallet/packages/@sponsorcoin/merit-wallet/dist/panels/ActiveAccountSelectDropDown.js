import { jsx as _jsx } from "react/jsx-runtime";
// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/panels/ActiveAccountSelectDropDown.tsx
//
// 2026-11-11 (owner): renamed from WalletAccountSelectDropDown: it is the active account's pill. 2026-11-01 (owner request): the wallet header's account pill, as its own dropdown. It replaces AccountSelectDropDown in WalletAccountHeader (the other AccountSelectDropDown uses -- the Send tab, staking, messages -- are untouched).
//
// Chevron rule (owner): the chevron points UP when WalletAccountListVisible, DOWN otherwise.
//   WalletAccountListVisible = the wallet's list panel (ASSET_SELECT_LIST_PANEL) is open AND LOCAL_ACCOUNT_WALLET_LIST, or any panel nested under it (isSubChildOf, spcoin-common), is visible.
// It reads the panel tree itself: the host passes no chevron state, so the pill cannot disagree with what is drawn.
import { useSyncExternalStore } from 'react';
import { SP_COIN_DISPLAY, PARENT_OF, isSubChildOf } from '@sponsorcoin/spcoin-common/panels';
import { walletPartClass } from '@sponsorcoin/spcoin-common/styles';
import { panelStore, engineTrace, useSelectedAccount, buildSpCoinAccount } from '@sponsorcoin/spcoin-exchange-engine';
import { AccountSelectDropDown, ASSET_SELECT_DISPLAY } from '@sponsorcoin/spcoin-panels';
/** LOCAL_ACCOUNT_WALLET_LIST and everything nested under it, any depth. */
const ACCOUNT_LIST_PANELS = [
    SP_COIN_DISPLAY.LOCAL_ACCOUNT_WALLET_LIST,
    ...Object.keys(PARENT_OF)
        .map((id) => Number(id))
        .filter((id) => isSubChildOf(SP_COIN_DISPLAY.LOCAL_ACCOUNT_WALLET_LIST, id)),
];
const readWalletAccountListVisible = () => panelStore.getPanelSnapshot(SP_COIN_DISPLAY.ASSET_SELECT_LIST_PANEL) &&
    ACCOUNT_LIST_PANELS.some((panel) => panelStore.getPanelSnapshot(panel));
/** WalletAccountListVisible (see the header comment). */
export function useWalletAccountListVisible() {
    return useSyncExternalStore((callback) => {
        const unsubscribers = [SP_COIN_DISPLAY.ASSET_SELECT_LIST_PANEL, ...ACCOUNT_LIST_PANELS].map((panel) => panelStore.subscribePanel(panel, callback));
        return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
    }, readWalletAccountListVisible, () => false);
}
export default function ActiveAccountSelectDropDown({ icon, address, symbol, name, placeholderLabel, onSelectClick, onIconClick, onActivate, onIconContextMenu }) {
    const chevronUp = useWalletAccountListVisible();
    const [, setSelectedAccount] = useSelectedAccount();
    // activate first, then the AccountSelectDropDown actions
    const activate = () => {
        if (!address || !onActivate)
            return;
        try {
            void Promise.resolve(onActivate(address)).catch((error) => engineTrace('activeAccountSelect:activateFailed', { address, error: error instanceof Error ? error.message : String(error) }));
        }
        catch (error) {
            engineTrace('activeAccountSelect:activateFailed', { address, error: error instanceof Error ? error.message : String(error) });
        }
    };
    return (
    // 2026-11-11 (owner): extends AccountSelectDropDown (the portable one the other account pills share) instead of sitting on AssetSelectDropDown beside it; what is its own is the id, the chevron rule and the compact header sizes.
    _jsx(AccountSelectDropDown, { rootId: "WALLET_ACCOUNT_HEADER", hasEntity: Boolean(address), icon: icon, symbol: symbol, name: name, address: address ?? '', label: placeholderLabel ?? 'Select Account', copyLabel: "Copy Account Address", showDisplay: ASSET_SELECT_DISPLAY.ICON |
            ASSET_SELECT_DISPLAY.SYMBOL |
            ASSET_SELECT_DISPLAY.NAME |
            ASSET_SELECT_DISPLAY.ADDRESS |
            ASSET_SELECT_DISPLAY.COPY |
            (chevronUp ? ASSET_SELECT_DISPLAY.CHEVRON_UP : ASSET_SELECT_DISPLAY.CHEVRON_DN) |
            ASSET_SELECT_DISPLAY.ADDR_COMP, 
        // activate first (above), then AccountSelectDropDown runs its own actions: it makes this the SELECTED account, then calls onSelectClick / onIconClick
        onSelected: address ? () => setSelectedAccount(buildSpCoinAccount({ address, ...(name ? { name } : {}), ...(symbol ? { symbol } : {}) })) : undefined, onSelectClick: onSelectClick || onActivate ? () => { activate(); onSelectClick?.(); } : undefined, onIconClick: onIconClick || onActivate ? () => { activate(); onIconClick?.(address ?? ''); } : undefined, onIconContextMenu: onIconContextMenu ? () => onIconContextMenu(address ?? '') : undefined, addrPrePostSize: 4, 
        // 2026-11-13 (owner): the header's expanded address shows as much of itself as fits, not a clip at the end
        fitAddress: true, iconSizeClassName: walletPartClass.compactPill.iconSize, pillHeightClassName: walletPartClass.compactPill.pillHeight, pillFontClassName: walletPartClass.compactPill.pillFont, chevronSize: walletPartClass.compactPill.chevronSize, copyIconSize: walletPartClass.compactPill.copyIconSize, nameLineClassName: walletPartClass.compactPill.nameLine }));
}
