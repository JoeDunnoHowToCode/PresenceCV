import { describe, it, expect } from 'vitest';
import { spawnSync } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
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

  it('flags a report that contains no rules tests', () => {
    const problems = findRulesSuiteProblems({ testResults: [] });

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('No rules tests ran');
  });
});

describe('check-rules-report CLI', () => {
  it('exits 1 and prints the problem for skipped rules tests, and exits 0 for a clean report', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rules-report-'));
    try {
      const skippedReport = join(dir, 'skipped.json');
      const cleanReport = join(dir, 'clean.json');
      writeFileSync(skippedReport, JSON.stringify(reportWith(['passed', 'skipped'])));
      writeFileSync(cleanReport, JSON.stringify(reportWith(['passed', 'passed'])));

      const failing = spawnSync(process.execPath, ['scripts/check-rules-report.mjs', skippedReport], { encoding: 'utf8' });
      const passing = spawnSync(process.execPath, ['scripts/check-rules-report.mjs', cleanReport], { encoding: 'utf8' });

      expect(failing.status).toBe(1);
      expect(failing.stderr).toContain('1 of 2 rules tests did not run');
      expect(passing.status).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
