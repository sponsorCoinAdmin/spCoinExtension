// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/panelTree/panelTreeRadioController.ts
//
// 2026-09-18 — moved from the parent app's
// lib/context/exchangeContext/panelTree/panelTreeRadioController.ts
// (panel-tree runtime migration). Pure functions, no coupling found —
// content unchanged except its `panelTreePersistence` import now resolves
// to @sponsorcoin/spcoin-common/panels' `panelPersistence.ts` (copied
// there 2026-09-06, ahead of this migration — flattenPanelTree isn't
// used here, only ensurePanelPresent/panelName, so the rename to
// flattenPersistedPanelTree doesn't affect this file).
import { SP_COIN_DISPLAY, ensurePanelPresent, panelName } from '@sponsorcoin/spcoin-common/panels';
// 2026-09-29, real fix — the debug flag below used to be a frozen
// module-level const (DEBUG_RADIO) reading
// process.env.NEXT_PUBLIC_DEBUG_LOG_PANEL_TREE directly; every call site
// now reads flags.DEBUG_LOG_PANEL_TREE live instead (this file's own
// functions run long after module load, so a one-time snapshot would
// never reflect a later configureDebugFlags() call) — see debugFlags.ts's
// own header comment.
import { flags } from './debugFlags';
const nameOf = (id) => SP_COIN_DISPLAY[id] ?? String(id);
function isRecord(v) {
    return !!v && typeof v === 'object';
}
/**
 * Accepts:
 * - strict nodes: [{id,name}]
 * - legacy ids: number[]
 * - older experimental: [{displayTypeId,...}]
 * - mixed arrays (defensive)
 */
function normalizeDisplayStackToIds(raw) {
    if (!Array.isArray(raw))
        return [];
    const ids = [];
    for (const item of raw) {
        // tolerate ids-only arrays
        if (typeof item === 'number' || typeof item === 'string') {
            ids.push(Number(item));
            continue;
        }
        if (!isRecord(item))
            continue;
        if ('id' in item) {
            ids.push(Number(item.id));
            continue;
        }
        if ('displayTypeId' in item) {
            ids.push(Number(item.displayTypeId));
            continue;
        }
    }
    return ids
        .filter((x) => Number.isFinite(x))
        .map((x) => x);
}
function summarizeOverlayState(list, overlays) {
    return list
        .filter((e) => overlays.includes(e.panel))
        .map((e) => ({ p: nameOf(e.panel), v: !!e.visible }));
}
function hasAnyVisible(list, overlays) {
    for (const e of list) {
        if (overlays.includes(e.panel) && !!e.visible)
            return true;
    }
    return false;
}
function diffCount(before, after) {
    const m = new Map(before.map((x) => [x.p, x.v]));
    let changed = 0;
    for (const a of after) {
        if (m.get(a.p) !== a.v)
            changed++;
    }
    return changed;
}
function getVisiblePanels(flat) {
    return flat.filter((e) => !!e.visible).map((e) => nameOf(e.panel));
}
function getGroupVisibility(flat, members) {
    const set = new Set(members.map((m) => Number(m)));
    return flat
        .filter((e) => set.has(Number(e.panel)))
        .map((e) => ({ p: nameOf(e.panel), v: !!e.visible }));
}
function countVisibleInGroup(flat, members) {
    const set = new Set(members.map((m) => Number(m)));
    let n = 0;
    for (const e of flat) {
        if (set.has(Number(e.panel)) && !!e.visible)
            n++;
    }
    return n;
}
function summarizeStackTail(stack, tail = 12) {
    const start = Math.max(0, stack.length - tail);
    return stack.slice(start).map(nameOf);
}
/**
 * Apply radio selection for an arbitrary group:
 * - target is set visible=true
 * - all other group members are set visible=false
 * - any missing members are ensured present
 */
export function applyRadioSelection(flatIn, groupMembers, target, withName) {
    const members = Array.from(groupMembers);
    // Ensure all members exist in the flat list so visibility writes are deterministic.
    let next = flatIn;
    for (const id of members)
        next = ensurePanelPresent(next, id);
    const before = flags.DEBUG_LOG_PANEL_TREE
        ? {
            target: nameOf(target),
            group: members.map(nameOf),
            groupBefore: getGroupVisibility(next, members),
            visibleBefore: getVisiblePanels(next),
        }
        : null;
    const out = members.reduce((acc, id) => {
        const idx = acc.findIndex((e) => Number(e.panel) === Number(id));
        if (idx >= 0) {
            acc[idx] = { ...withName(acc[idx]), visible: Number(id) === Number(target) };
            return acc;
        }
        acc.push({
            panel: id,
            visible: Number(id) === Number(target),
            name: panelName(id),
        });
        return acc;
    }, [...next]);
    if (flags.DEBUG_LOG_PANEL_TREE) {
        const groupAfter = getGroupVisibility(out, members);
        const changed = diffCount(before?.groupBefore ?? [], groupAfter);
        if (changed > 0) {
            // eslint-disable-next-line no-console
            console.log('[panelTreeRadioController] applyRadioSelection', {
                target: before?.target,
                changed,
                group: before?.group,
                groupBefore: before?.groupBefore,
                groupAfter,
                visibleAfter: getVisiblePanels(out),
            });
        }
    }
    return out;
}
function findPrevStackMember(stack, fromIndexExclusive, predicate) {
    for (let i = fromIndexExclusive - 1; i >= 0; i--) {
        const id = stack[i];
        if (predicate(id))
            return id;
    }
    return null;
}
function indexOfLast(stack, id) {
    for (let i = stack.length - 1; i >= 0; i--) {
        if (Number(stack[i]) === Number(id))
            return i;
    }
    return -1;
}
/**
 * restorePrevRadioMember
 *
 * Policy:
 * - First, hide `closing`.
 * - Then, find the *first* radio group (by priority order) that contains `closing`.
 * - Traverse the `displayStack` backwards (from the position of `closing` if present,
 *   otherwise from the top) to find a previous member of that SAME radio group.
 * - If found, make it visible AND enforce the radio invariant (close the other members).
 * - If not found, stop (no selection restored here).
 *
 * Notes:
 * - Restores at most ONE group (the highest-priority matching group).
 * - Higher-level close logic can still enforce global defaults (e.g. ensure one overlay visible).
 *
 * Debugging:
 * - If opts.traceId is supplied, it will be printed so you can correlate multi-step closes.
 *
 * ✅ Required fix:
 * - `displayStack` may arrive as DISPLAY_STACK_NODE[] (new strict persisted shape) or legacy ids.
 * - We normalize here so restore logic is stable.
 */
export function restorePrevRadioMember(opts) {
    const { flatIn, closing, radioGroupsPriority, withName, trace } = opts;
    const displayStack = normalizeDisplayStackToIds(opts.displayStack);
    const topOfStack = displayStack.length > 0
        ? displayStack[displayStack.length - 1]
        : null;
    const closingWasTop = topOfStack != null && Number(topOfStack) === Number(closing);
    const closingVisibleBefore = flatIn.find((e) => Number(e.panel) === Number(closing))?.visible ?? false;
    const logBase = flags.DEBUG_LOG_PANEL_TREE
        ? {
            traceId: trace?.traceId,
            closing: nameOf(closing),
            closingVisibleBefore,
            stackLen: displayStack.length,
            topOfStack: topOfStack ? nameOf(topOfStack) : null,
            closingWasTop,
            stackTail: summarizeStackTail(displayStack, 14),
        }
        : null;
    // 1) Always hide the closing panel.
    let next = flatIn.map((e) => Number(e.panel) === Number(closing) ? { ...withName(e), visible: false } : e);
    // 2) Find the first (highest priority) group that contains `closing`.
    const group = radioGroupsPriority.find((g) => g.members.some((m) => Number(m) === Number(closing)));
    if (!group) {
        if (flags.DEBUG_LOG_PANEL_TREE) {
            // eslint-disable-next-line no-console
            console.log('[panelTreeRadioController] restorePrevRadioMember (no group)', {
                ...logBase,
                matchedGroup: null,
                restored: null,
                visibleAfterHide: getVisiblePanels(next),
            });
        }
        return { nextFlat: next, restored: null };
    }
    // 3) Determine where to start traversing in the stack.
    const closingIdx = indexOfLast(displayStack, closing);
    const startIdx = closingIdx >= 0 ? closingIdx : displayStack.length;
    // 4) Find previous member of same radio group in displayStack.
    const prevMember = findPrevStackMember(displayStack, startIdx, (id) => group.members.some((m) => Number(m) === Number(id)));
    if (!prevMember) {
        if (flags.DEBUG_LOG_PANEL_TREE) {
            // eslint-disable-next-line no-console
            console.log('[panelTreeRadioController] restorePrevRadioMember (no prevMember)', {
                ...logBase,
                matchedGroup: group.name ?? '(unnamed)',
                closingIdx,
                startIdx,
                restored: null,
                groupMembers: group.members.map(nameOf),
                groupVisibleBefore: getGroupVisibility(flatIn, group.members),
                groupVisibleAfterHide: getGroupVisibility(next, group.members),
                visibleAfterHide: getVisiblePanels(next),
                warn: !closingWasTop ? 'non-top close request' : undefined,
            });
        }
        return { nextFlat: next, restored: null, matchedGroup: group.name };
    }
    // 5) Restore that member AND enforce radio invariant on that group.
    const groupVisibleBefore = flags.DEBUG_LOG_PANEL_TREE ? getGroupVisibility(flatIn, group.members) : null;
    next = applyRadioSelection(next, group.members, prevMember, withName);
    const groupVisibleAfter = flags.DEBUG_LOG_PANEL_TREE ? getGroupVisibility(next, group.members) : null;
    if (flags.DEBUG_LOG_PANEL_TREE) {
        const visibleCount = countVisibleInGroup(next, group.members);
        // eslint-disable-next-line no-console
        console.log('[panelTreeRadioController] restorePrevRadioMember', {
            ...logBase,
            matchedGroup: group.name ?? '(unnamed)',
            closingIdx,
            startIdx,
            restored: nameOf(prevMember),
            groupMembers: group.members.map(nameOf),
            groupVisibleBefore,
            groupVisibleAfter,
            groupVisibleCountAfter: visibleCount,
            visibleAfter: getVisiblePanels(next),
            warn: !closingWasTop ? 'non-top close request' : undefined,
            invariantWarn: visibleCount > 1 ? 'radio invariant violated (>1 visible)' : undefined,
        });
    }
    return { nextFlat: next, restored: prevMember, matchedGroup: group.name };
}
/* ───────────────────────────── Global Overlay Radio (existing) ───────────────────────────── */
/**
 * Enforces a "global overlay radio" selection:
 * - exactly one overlay in `overlays` is visible (the `target`)
 * - other overlays are set to visible=false
 */
export function applyGlobalRadio(accIn, overlays, target, withName) {
    const before = flags.DEBUG_LOG_PANEL_TREE ? summarizeOverlayState(accIn, overlays) : null;
    const out = overlays.reduce((acc, id) => {
        const idx = acc.findIndex((e) => e.panel === id);
        if (idx >= 0) {
            acc[idx] = { ...withName(acc[idx]), visible: id === target };
        }
        else {
            acc.push({
                panel: id,
                visible: id === target,
                name: panelName(id),
            });
        }
        return acc;
    }, [...accIn]);
    if (flags.DEBUG_LOG_PANEL_TREE) {
        const after = summarizeOverlayState(out, overlays);
        const changed = diffCount(before ?? [], after);
        if (changed > 0) {
            // eslint-disable-next-line no-console
            console.log('[panelTreeRadioController] applyGlobalRadio', {
                target: nameOf(target),
                changed,
                before,
                after,
            });
        }
    }
    return out;
}
export function clearGlobalRadio(flat0, overlays, withName) {
    const shouldLog = flags.DEBUG_LOG_PANEL_TREE && hasAnyVisible(flat0, overlays);
    const before = shouldLog ? summarizeOverlayState(flat0, overlays) : null;
    const out = overlays.reduce((acc, id) => {
        const idx = acc.findIndex((e) => e.panel === id);
        if (idx >= 0) {
            acc[idx] = { ...withName(acc[idx]), visible: false };
        }
        else {
            acc.push({
                panel: id,
                visible: false,
                name: panelName(id),
            });
        }
        return acc;
    }, [...flat0]);
    if (shouldLog) {
        const after = summarizeOverlayState(out, overlays);
        const changed = diffCount(before ?? [], after);
        if (changed > 0) {
            // eslint-disable-next-line no-console
            console.log('[panelTreeRadioController] clearGlobalRadio', {
                changed,
                before,
                after,
            });
        }
    }
    return out;
}
/**
 * ensure exactly one overlay is visible.
 * - If any overlay is already visible, do nothing.
 * - Otherwise ensure defaultOverlay is present and selected.
 */
export function ensureOneGlobalOverlayVisible(flatIn, overlays, defaultOverlay, withName) {
    const m = new Map();
    for (const e of flatIn)
        m.set(Number(e.panel), !!e.visible);
    let any = false;
    for (const id of overlays) {
        if (m.get(Number(id))) {
            any = true;
            break;
        }
    }
    if (any)
        return flatIn;
    let next = ensurePanelPresent(flatIn, defaultOverlay);
    next = applyGlobalRadio(next, overlays, defaultOverlay, withName);
    return next;
}
export function switchToDefaultGlobal(flatIn, overlays, defaultOverlay, withName) {
    if (flags.DEBUG_LOG_PANEL_TREE) {
        // eslint-disable-next-line no-console
        console.log('[panelTreeRadioController] switchToDefaultGlobal', {
            defaultOverlay: nameOf(defaultOverlay),
        });
    }
    let next = ensurePanelPresent(flatIn, defaultOverlay);
    next = applyGlobalRadio(next, overlays, defaultOverlay, withName);
    return next;
}
