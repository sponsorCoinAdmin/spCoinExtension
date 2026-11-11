import { jsx as _jsx } from "react/jsx-runtime";
import { walletPartClass, removeAccountStyle } from '@sponsorcoin/spcoin-common/styles';
import { AssetSelectDropDown, ASSET_SELECT_DISPLAY } from '@sponsorcoin/spcoin-panels';
import { ANONYMOUS_ACCOUNT_AVATAR_URL } from '@sponsorcoin/spcoin-feeds/accounts';
export default function AccountDisplayDropDown({ address, name, symbol, logoURL }) {
    return (_jsx(AssetSelectDropDown, { rootId: "ACCOUNT_DISPLAY", hasEntity: Boolean(address), icon: logoURL ? _jsx("img", { src: logoURL, alt: "", style: removeAccountStyle.accountImage }) : undefined, defaultIconSrc: ANONYMOUS_ACCOUNT_AVATAR_URL, showIconWhenEmpty: true, symbol: symbol, name: name, address: address, placeholderLabel: "Account", copyLabel: "Copy Account Address", showDisplay: ASSET_SELECT_DISPLAY.ICON | ASSET_SELECT_DISPLAY.SYMBOL | ASSET_SELECT_DISPLAY.NAME | ASSET_SELECT_DISPLAY.ADDRESS | ASSET_SELECT_DISPLAY.COPY | ASSET_SELECT_DISPLAY.ADDR_COMP, addrPrePostSize: 4, defaultExpanded: true, iconSizeClassName: walletPartClass.displayPill.iconSize, pillHeightClassName: walletPartClass.displayPill.pillHeight, pillFontClassName: walletPartClass.displayPill.pillFont, chevronSize: walletPartClass.displayPill.chevronSize, copyIconSize: walletPartClass.displayPill.copyIconSize, nameLineClassName: walletPartClass.displayPill.nameLine }));
}
