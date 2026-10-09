import { describe, it, expect } from 'vitest';
import { findRulesSuiteProblems } from '../scripts/check-rules-report.mjs';

// Shape of a Vitest JSON report: one entry per test file, one assertion per test.
const reportWith = (statuses: string[]) => ({
  testResults: [
    {
      assertionResults: statuses.map((status, i) => ({ title: `rules test ${i + 1}`, status })),
    },
  ],
});

describe('findRulesSuiteProblems', () => {
  it('returns no problems when every rules test ran', () => {
    expect(findRulesSuiteProblems(reportWith(['passed', 'passed', 'passed']))).toEqual([]);
  });

  it('flags rules tests that were skipped or marked todo', () => {
    const problems = findRulesSuiteProblems(reportWith(['passed', 'skipped', 'todo']));

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('2 of 3 rules tests did not run');
  });
});
