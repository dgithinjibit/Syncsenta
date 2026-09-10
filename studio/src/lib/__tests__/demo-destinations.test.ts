import { describe, expect, it } from 'vitest';
import { DEMO_DESTINATIONS, getDemoDestination } from '../auth/demo-destinations';

describe('demo role destinations', () => {
  it('routes each role to its canonical dashboard', () => {
    expect(DEMO_DESTINATIONS.student).toBe('/student');
    expect(DEMO_DESTINATIONS.teacher).toBe('/teacher');
    expect(DEMO_DESTINATIONS.head).toBe('/head');
    expect(DEMO_DESTINATIONS.parent).toBe('/parent');
  });

  it('normalizes role input before resolving a destination', () => {
    expect(getDemoDestination(' Teacher ')).toBe('/teacher');
    expect(getDemoDestination('HEAD')).toBe('/head');
  });

  it('rejects unsupported roles', () => {
    expect(getDemoDestination('admin')).toBeNull();
    expect(getDemoDestination('')).toBeNull();
  });
});
