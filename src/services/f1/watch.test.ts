import { describe, expect, it } from 'vitest';
import { getWatchProvider, resolveWatch } from './watch';

describe('resolveWatch', () => {
  it('maps known providers to their URLs', () => {
    expect(resolveWatch({ provider: 'f1tv' })).toEqual({ name: 'F1 TV', url: 'https://f1tv.formula1.com/' });
    expect(resolveWatch({ provider: 'apple-tv' }).url).toBe('https://tv.apple.com/');
  });

  it('falls back to Apple TV for unknown ids', () => {
    expect(getWatchProvider('nope' as never).id).toBe('apple-tv');
  });

  it('only accepts http(s) custom links', () => {
    expect(resolveWatch({ provider: 'custom', customUrl: ' https://example.com/live ' }).url).toBe('https://example.com/live');
    expect(resolveWatch({ provider: 'custom', customUrl: 'javascript:alert(1)' }).url).toBeNull();
    expect(resolveWatch({ provider: 'custom' }).url).toBeNull();
  });
});
