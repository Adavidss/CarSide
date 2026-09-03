import { describe, expect, it } from 'vitest';
import { estimateDriveMinutes, leaveBy } from './drive';

describe('drive estimate', () => {
  it('scales with distance and adds parking time', () => {
    expect(estimateDriveMinutes(1)).toBe(7);
    expect(estimateDriveMinutes(12)).toBe(29);
    expect(estimateDriveMinutes(48)).toBeGreaterThan(estimateDriveMinutes(12));
  });

  it('computes a leave-by time with a buffer', () => {
    const start = new Date('2026-09-05T12:00:00Z');
    const leave = leaveBy(start, 12);
    expect((start.getTime() - leave.getTime()) / 60_000).toBe(29 + 10);
  });
});
