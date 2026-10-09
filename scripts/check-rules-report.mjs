// Fails `npm run test:rules` when the Firestore rules suite did not actually run.
// Vitest 1.6's JSON summary counts skipped tests as passed, so read each test's status.

export function findRulesSuiteProblems(report) {
  const tests = report.testResults.flatMap((file) => file.assertionResults);
  const notRun = tests.filter((test) => test.status !== 'passed' && test.status !== 'failed');
  if (notRun.length > 0) {
    return [`${notRun.length} of ${tests.length} rules tests did not run (skipped or todo).`];
  }
  return [];
}
