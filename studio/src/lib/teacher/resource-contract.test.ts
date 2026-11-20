import { describe, expect, it } from 'vitest';
import { parseCreateTeacherResourceInput } from './resource-contract';

describe('parseCreateTeacherResourceInput', () => {
  it('trims resource metadata while preserving the authored content', () => {
    expect(parseCreateTeacherResourceInput({
      title: '  Grade 6 worksheet  ',
      type: 'Worksheet',
      content: '  # Fractions\n\nCompare these examples.  ',
      grade: ' Grade 6 ',
      subject: ' Mathematics ',
    })).toEqual({
      title: 'Grade 6 worksheet',
      type: 'Worksheet',
      content: '  # Fractions\n\nCompare these examples.  ',
      grade: 'Grade 6',
      subject: 'Mathematics',
    });
  });

  it('rejects empty titles and content', () => {
    expect(parseCreateTeacherResourceInput({
      title: '  ',
      type: 'Worksheet',
      content: '  ',
    })).toBeNull();
  });

  it('rejects unsupported resource types', () => {
    expect(parseCreateTeacherResourceInput({
      title: 'Example',
      type: 'Unknown',
      content: 'Lesson content',
    })).toBeNull();
  });

  it('rejects content larger than the database contract allows', () => {
    expect(parseCreateTeacherResourceInput({
      title: 'Large resource',
      type: 'Other',
      content: 'x'.repeat(1_000_001),
    })).toBeNull();
  });
});
