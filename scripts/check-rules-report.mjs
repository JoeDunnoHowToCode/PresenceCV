// Fails `npm run test:rules` when the Firestore rules suite did not actually run.
// Vitest 1.6's JSON summary counts skipped tests as passed, so read each test's status.
// Usage: node scripts/check-rules-report.mjs <vitest-json-report>

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function findRulesSuiteProblems(report) {
  const tests = report.testResults.flatMap((file) => file.assertionResults);
  if (tests.length === 0) {
    return ['No rules tests ran: the report contains no tests.'];
  }
  const notRun = tests.filter((test) => test.status !== 'passed' && test.status !== 'failed');
  if (notRun.length > 0) {
    return [`${notRun.length} of ${tests.length} rules tests did not run (skipped or todo).`];
  }
  return [];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  const problems = findRulesSuiteProblems(report);
  for (const problem of problems) console.error(`check-rules-report: ${problem}`);
  process.exit(problems.length > 0 ? 1 : 0);
}
