// File: src/debugOverlay.ts
//
// 2026-10-31 (owner request: debugging in the extension): a small bug button in the side panel's corner that shows the worker's trace (src/debugTrace.ts) over the wallet, with Copy and Clear.
// Plain DOM, outside the React tree, so it works whatever screen the wallet is on (including the login).
export function mountDebugOverlay(): void {
  if (document.getElementById('merit-debug-overlay')) return;
  const button = document.createElement('button');
  button.id = 'merit-debug-overlay';
  button.textContent = 'bug';
  button.title = 'Show the connection trace';
  button.style.cssText = 'position:fixed;right:6px;bottom:30px;z-index:2147483647;padding:1px 6px;font:11px monospace;background:#7f1d1d;color:#fff;border:0;border-radius:4px;opacity:.7;cursor:pointer';
  const panel = document.createElement('div');
  panel.style.cssText = 'position:fixed;inset:0;z-index:2147483646;background:#0b1020f2;color:#9fe;font:11px monospace;display:none;flex-direction:column;padding:8px;gap:6px';
  const bar = document.createElement('div');
  bar.style.cssText = 'display:flex;gap:6px';
  const pre = document.createElement('pre');
  pre.style.cssText = 'flex:1;overflow:auto;margin:0;white-space:pre-wrap;word-break:break-all';
  const mk = (label: string, onClick: () => void) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = 'padding:2px 8px;font:11px monospace;background:#1e3a8a;color:#fff;border:0;border-radius:4px;cursor:pointer';
    b.onclick = onClick;
    bar.appendChild(b);
  };
  let lines: string[] = [];
  const refresh = async () => {
    const reply = (await chrome.runtime.sendMessage({ type: 'merit/debug/get' }).catch(() => undefined)) as { lines?: string[] } | undefined;
    lines = reply?.lines ?? [];
    pre.textContent = lines.length ? lines.join('\n') : '(no trace yet)';
    pre.scrollTop = pre.scrollHeight;
  };
  mk('Refresh', () => void refresh());
  mk('Copy', () => void navigator.clipboard?.writeText(lines.join('\n')).catch(() => undefined));
  mk('Clear', () => void chrome.runtime.sendMessage({ type: 'merit/debug/clear' }).then(refresh).catch(() => undefined));
  mk('Close', () => (panel.style.display = 'none'));
  panel.append(bar, pre);
  let timer: number | undefined;
  button.onclick = () => {
    const open = panel.style.display === 'none';
    panel.style.display = open ? 'flex' : 'none';
    window.clearInterval(timer);
    if (open) {
      void refresh();
      timer = window.setInterval(() => void refresh(), 1000);
    }
  };
  document.body.append(panel, button);
}
