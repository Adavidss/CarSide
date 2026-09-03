/**
 * OpenF1 supporter authentication. The supporter tier unlocks live data; the token is an
 * ID token (JWT) obtained from POST https://api.openf1.org/token with the account's
 * username and password. CarSide sends those straight to OpenF1 over HTTPS and keeps only
 * the returned token (and its expiry) on the device.
 */
import type { OpenF1Auth } from '@/models/settings';

const TOKEN_URL = 'https://api.openf1.org/token';

interface TokenResponse {
  access_token?: string;
  id_token?: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
}

/** Expiry (epoch ms) from a JWT's `exp` claim, or undefined when it isn't a JWT. */
export function decodeJwtExpiry(token: string): number | undefined {
  const parts = token.split('.');
  if (parts.length < 2) return undefined;
  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(atob(payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '=')));
    return typeof json.exp === 'number' ? json.exp * 1000 : undefined;
  } catch {
    return undefined;
  }
}

export function isTokenExpired(auth: OpenF1Auth | null, now = Date.now()): boolean {
  if (!auth) return true;
  return auth.expiresAt !== undefined && auth.expiresAt <= now;
}

/** Minutes until expiry, or null when unknown. */
export function tokenMinutesLeft(auth: OpenF1Auth | null, now = Date.now()): number | null {
  if (!auth?.expiresAt) return null;
  return Math.max(0, Math.round((auth.expiresAt - now) / 60_000));
}

export class OpenF1AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OpenF1AuthError';
  }
}

/** Exchange OpenF1 account credentials for a token. The password is used once and discarded. */
export async function loginOpenF1(username: string, password: string, signal?: AbortSignal): Promise<OpenF1Auth> {
  const body = new URLSearchParams({ username: username.trim(), password });
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body,
    signal,
  });
  const data = (await response.json().catch(() => ({}))) as TokenResponse & { detail?: string };
  if (response.status === 401) throw new OpenF1AuthError('OpenF1 rejected the email or password.');
  if (!response.ok) throw new OpenF1AuthError(typeof data.detail === 'string' ? data.detail : `OpenF1 sign-in failed (${response.status}).`);
  const token = data.access_token ?? data.id_token;
  if (!token) throw new OpenF1AuthError('OpenF1 did not return a token.');
  const expiresAt = data.expires_in ? Date.now() + data.expires_in * 1000 : decodeJwtExpiry(token);
  return { token, expiresAt, email: username.trim(), refreshToken: data.refresh_token };
}

/** Wrap a pasted token. */
export function authFromPastedToken(raw: string): OpenF1Auth {
  const token = raw.trim().replace(/^bearer\s+/i, '');
  if (!token) throw new OpenF1AuthError('Paste the token first.');
  return { token, expiresAt: decodeJwtExpiry(token) };
}
