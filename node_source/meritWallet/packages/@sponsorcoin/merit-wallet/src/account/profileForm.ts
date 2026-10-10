// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/account/profileForm.ts
//
// 2026-10-09 -- the account profile form's fields and rules, moved from the web app's app/(menu)/(dynamic)/(accounts)/CreateAccount (createAccountConstants.ts,
// createAccountHelpers.ts, and the validateField / validatePreSend closures of useCreateAccountForm.ts): the same fields, the same length limits and the same messages.
// Pure TypeScript with no host imports, so both apps validate identically (test/accountProfile.test.mjs).

export type ProfileField = 'name' | 'symbol' | 'email' | 'website' | 'description';

export interface ProfileFormData {
  name: string;
  symbol: string;
  email: string;
  website: string;
  description: string;
}

export type ProfileFormErrors = Partial<Record<ProfileField, string>>;

export const PROFILE_FIELDS: ProfileField[] = ['name', 'symbol', 'email', 'website', 'description'];

export const EMPTY_PROFILE: ProfileFormData = { name: '', symbol: '', email: '', website: '', description: '' };

export const FIELD_MAX_LENGTHS: Record<ProfileField, number> = { name: 50, symbol: 10, email: 256, website: 256, description: 1024 };

/** The avatar the hosted app stores: 400 x 400 PNG, at most 500 KB, from an input of at most 25 MB. */
export const LOGO_TARGET_PX = 400;
export const LOGO_MAX_OUTPUT_BYTES = 500 * 1024;
export const LOGO_MAX_INPUT_BYTES = 25 * 1024 * 1024;

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isValidWebsite(value: string): boolean {
  if (!value) return true;
  if (value.startsWith('/assets/') || value.startsWith('assets/')) return true;
  try {
    const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`;
    const url = new URL(candidate);
    const hostname = String(url.hostname || '').toLowerCase();
    return /^https?:$/i.test(url.protocol) && hostname.includes('.');
  } catch {
    return false;
  }
}

const TOO_LARGE: Record<ProfileField, string> = {
  name: 'Name too large',
  symbol: 'Symbol too large',
  email: 'Email too large',
  website: 'Website too large',
  description: 'Description too large',
};

export function validateProfileField(field: ProfileField, rawValue: string): string | null {
  const raw = String(rawValue ?? '');
  const value = raw.trim();
  if (raw.length > FIELD_MAX_LENGTHS[field]) return TOO_LARGE[field];
  if (field === 'email' && value && !isValidEmail(value)) return 'Invalid email address';
  if (field === 'website' && value && !isValidWebsite(value)) return 'Invalid website URL';
  return null;
}

export function validateProfile(values: ProfileFormData): ProfileFormErrors {
  const errors: ProfileFormErrors = {};
  for (const field of PROFILE_FIELDS) {
    const error = validateProfileField(field, values[field]);
    if (error) errors[field] = error;
  }
  return errors;
}

export function trimProfile(data: ProfileFormData): ProfileFormData {
  return { name: data.name.trim(), symbol: data.symbol.trim(), email: data.email.trim(), website: data.website.trim(), description: data.description.trim() };
}

export function profileChanged(a: ProfileFormData, b: ProfileFormData): boolean {
  return PROFILE_FIELDS.some((field) => a[field].trim() !== b[field].trim());
}
