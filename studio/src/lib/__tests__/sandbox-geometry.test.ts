import { describe, expect, it } from 'vitest';
import {
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
  getRenderScale,
  toLogicalPoint,
} from '@/lib/sandbox/sandbox-geometry';

describe('responsive sandbox geometry', () => {
  it('preserves the logical coordinate system on a narrow phone canvas', () => {
    expect(getRenderScale(320, 160)).toBeCloseTo(320 / LOGICAL_WIDTH);
    expect(toLogicalPoint(160, 80, { left: 0, top: 0, width: 320, height: 160 })).toEqual({
      x: 300,
      y: 150,
    });
  });

  it('maps tablet and desktop pointer coordinates consistently', () => {
    expect(toLogicalPoint(400, 200, { left: 20, top: 10, width: 760, height: 380 })).toEqual({
      x: 300,
      y: 150,
    });
    expect(toLogicalPoint(620, 310, { left: 0, top: 0, width: 1200, height: 600 })).toEqual({
      x: 310,
      y: 155,
    });
  });

  it('keeps the logical canvas aspect ratio explicit', () => {
    expect(LOGICAL_WIDTH / LOGICAL_HEIGHT).toBe(2);
  });
});
