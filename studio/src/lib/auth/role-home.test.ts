import { describe, expect, it } from 'vitest';
import { getRoleHome } from './role-home';

describe('getRoleHome', () => {
  it.each([
    ['student', '/student'],
    ['teacher', '/teacher'],
    ['parent', '/parent'],
    ['admin', '/head'],
    ['school_head', '/head'],
    ['school_admin', '/head'],
    ['national_admin', '/head'],
    ['county_officer', '/teacher'],
  ])('maps %s to %s', (role, expected) => {
    expect(getRoleHome(role)).toBe(expected);
  });

  it('fails closed for an unknown role', () => {
    expect(getRoleHome('unknown')).toBe('/login');
  });
});
