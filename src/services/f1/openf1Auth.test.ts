import { describe, expect, it } from 'vitest';
import { authFromPastedToken, decodeJwtExpiry, isTokenExpired, tokenMinutesLeft } from './openf1Auth';

const b64url = (obj: unknown) => btoa(JSON.stringify(obj)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const jwt = (exp: number) => `${b64url({ alg: 'RS256' })}.${b64url({ exp, sub: 'x' })}.sig`;

describe('OpenF1 auth helpers', () => {
  it('reads the expiry from a JWT', () => {
    expect(decodeJwtExpiry(jwt(1_800_000_000))).toBe(1_800_000_000_000);
    expect(decodeJwtExpiry('not-a-jwt')).toBeUndefined();
  });

  it('wraps a pasted token and strips a Bearer prefix', () => {
    const auth = authFromPastedToken(`Bearer ${jwt(1_800_000_000)}`);
    expect(auth.token.startsWith('Bearer')).toBe(false);
    expect(auth.expiresAt).toBe(1_800_000_000_000);
    expect(() => authFromPastedToken('   ')).toThrow();
  });

  it('knows when a token has expired', () => {
    const now = 1_700_000_000_000;
    expect(isTokenExpired({ token: 't', expiresAt: now - 1 }, now)).toBe(true);
    expect(isTokenExpired({ token: 't', expiresAt: now + 60_000 }, now)).toBe(false);
    expect(tokenMinutesLeft({ token: 't', expiresAt: now + 30 * 60_000 }, now)).toBe(30);
    expect(tokenMinutesLeft({ token: 't' }, now)).toBeNull();
  });
});
