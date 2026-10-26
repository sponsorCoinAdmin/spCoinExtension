import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { detailPanelStyle } from '@sponsorcoin/spcoin-common/styles';
import { useCopyFeedback } from '../platform/useCopyFeedback';
/** Own small inline SVG, not lucide-react (the package has no such dependency — see TokenSlotPanels.tsx's own CopyBtn for the Tailwind sibling of this icon). */
function CopyGlyph({ copied }) {
    return copied ? (_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("polyline", { points: "20 6 9 17 4 12" }) })) : (_jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("rect", { x: "9", y: "9", width: "13", height: "13", rx: "2", ry: "2" }), _jsx("path", { d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" })] }));
}
export default function DetailRow({ label, value, zebra, copyable }) {
    const { copy, copiedKey } = useCopyFeedback();
    const text = typeof value === 'string' ? value : undefined;
    const showCopy = copyable && !!text;
    return (_jsxs("div", { style: detailPanelStyle.row(zebra), children: [_jsx("span", { style: detailPanelStyle.label, children: label }), showCopy ? (_jsxs("span", { style: detailPanelStyle.valueRow, children: [_jsx("span", { style: detailPanelStyle.copyValue, children: value }), _jsx("button", { type: "button", title: "Copy to clipboard", "aria-label": "Copy to clipboard", onClick: () => copy(text, label), style: copiedKey === label ? detailPanelStyle.copyButtonCopied : detailPanelStyle.copyButton, children: _jsx(CopyGlyph, { copied: copiedKey === label }) })] })) : (_jsx("span", { style: detailPanelStyle.value, children: value }))] }));
}
