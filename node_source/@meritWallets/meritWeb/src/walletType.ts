// File: src/walletType.ts
//
// Pure: which Merit type the page was told to show. The parent page's injected type wins; not framed, or a name that is not a type: WEB.
const TYPES = ['EXT', 'WEB_APP', 'WEB', 'ANDROID', 'IPHONE'] as const;
export type MeritWebType = (typeof TYPES)[number];

export function resolveWalletType(injected: string | undefined): MeritWebType {
  const name = (injected ?? '').toUpperCase().replace(' ', '_');
  return (TYPES as readonly string[]).includes(name) ? (name as MeritWebType) : 'WEB';
}
