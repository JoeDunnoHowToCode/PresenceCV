import { describe, it, expect } from 'vitest';
import { ParsedResumeSchema } from '../src/types';

describe('useResume Zod Validation', () => {
  it('parses perfect data correctly', () => {
    const data = {
      profile: { name: 'John Doe', email: 'john@example.com' },
      contactItems: [{ icon: 'Mail', text: 'john@example.com', url: 'mailto:john@example.com' }],
      experience: [],
      education: [],
      skills: ['React']
    };
    const parsed = ParsedResumeSchema.parse(data);
    expect(parsed.profile.name).toBe('John Doe');
    expect(parsed.contactItems?.length).toBe(1);
    expect(parsed.skills?.[0]).toBe('React');
  });

  it('recovers from missing or null fields using .catch()', () => {
    const badData = {
      profile: { name: 'Missing Info' },
      contactItems: null,
      experience: null,
      skills: null
    };
    const parsed = ParsedResumeSchema.parse(badData);
    expect(parsed.profile.name).toBe('Missing Info');
    expect(parsed.contactItems).toEqual([]);
    expect(parsed.experience).toEqual([]);
    expect(parsed.skills).toEqual([]);
    expect(parsed.profile.title).toBe('');
  });
});
