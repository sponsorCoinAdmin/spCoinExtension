// File: src/framedDebugCapture.ts
//
// 2026-11-19: the framed wallet's capture of what the page can see (errors, console warnings, the engine's trace lines) and the page's storage names, handed to the wallet's own ladybug dump (Ctrl+Alt+B). There is no separate debug pane any more:
// the dump is the one place to look, in this app and in the extension. Nothing secret is read (no keys, no passwords).
import { setEngineTrace } from '@sponsorcoin/spcoin-exchange-engine';
import { meritDebug } from '@meritWallets/meritWeb';

const show = (v: unknown): string => {
  try {
    return typeof v === 'string' ? v : JSON.stringify(v);
  } catch {
    return String(v);
  }
};

let installed = false;
/** Start capturing once, before the wallet mounts, so nothing from boot is missed. */
export function installDebugCapture(): void {
  if (installed) return;
  installed = true;
  window.addEventListener('error', (e) => meritDebug.log('page', `ERROR ${e.message} @ ${e.filename}:${e.lineno}`));
  window.addEventListener('unhandledrejection', (e) => meritDebug.log('page', `REJECT ${show((e.reason as Error)?.message ?? e.reason)}`));
  for (const level of ['error', 'warn'] as const) {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      meritDebug.log('page', `${level.toUpperCase()} ${args.map(show).join(' ').slice(0, 400)}`);
      original(...args);
    };
  }
  // useStepPanel traces fire many times a second and would push everything else out of the buffer
  setEngineTrace((message: string, data?: unknown) => {
    if (/^useStepPanel:/.test(message)) return;
    meritDebug.log('engine', `${message} ${data === undefined ? '' : show(data).slice(0, 1500)}`);
  });
  // what this page's storage holds (names only, never values)
  meritDebug.setSection('storage', async () => {
    let databases = '(cannot list)';
    try {
      const dbs = await (indexedDB as IDBFactory & { databases?: () => Promise<Array<{ name?: string }>> }).databases?.();
      databases = dbs?.map((d) => d.name).join(', ') || '(none)';
    } catch {
      /* not listable here */
    }
    return { origin: location.origin, indexedDB: databases, sessionStorage_keys: Object.keys(sessionStorage).join(', '), localStorage_keys: Object.keys(localStorage).join(', ') };
  });
}
