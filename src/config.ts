const rawOrigin = (import.meta.env.VITE_APP_URL || 'http://localhost:3000').trim();
export const APP_URL = rawOrigin.replace(/\/+$/, '');
export const EXT_API_BASE = `${APP_URL}/api/spCoin/run-script`;
