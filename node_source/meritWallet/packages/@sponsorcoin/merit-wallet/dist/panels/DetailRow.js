import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { detailPanelStyle } from '@sponsorcoin/spcoin-common/styles';
export default function DetailRow({ label, value, zebra }) {
    return (_jsxs("div", { style: detailPanelStyle.row(zebra), children: [_jsx("span", { style: detailPanelStyle.label, children: label }), _jsx("span", { style: detailPanelStyle.value, children: value })] }));
}
