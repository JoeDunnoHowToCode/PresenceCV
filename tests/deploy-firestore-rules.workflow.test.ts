import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parse } from 'yaml';

// deploy-prod writes straight to the live presencecv Firestore, so only main may
// reach it. `deploys` models GitHub's documented trigger rules: a push must pass
// every filter it defines, path filters are skipped for tag pushes, and defining
// only `branches` keeps tag pushes from triggering at all. Manual runs
// (workflow_dispatch) skip the push filters, so only a job's `if` can gate them.
type Workflow = {
  on: {
    workflow_dispatch?: unknown;
    push?: { branches?: string[]; tags?: string[]; paths?: string[] };
  };
  jobs: Record<string, { if?: string }>;
};

type Run =
  | { event: 'push'; ref: string; changed: string[] }
  | { event: 'workflow_dispatch'; ref: string };

const workflow: Workflow = parse(
  readFileSync(resolve(__dirname, '../.github/workflows/deploy-firestore-rules.yml'), 'utf8')
);

function triggers(run: Run): boolean {
  if (run.event === 'workflow_dispatch') return 'workflow_dispatch' in workflow.on;
  const push = workflow.on.push;
  if (!push) return false;
  if (push.tags) throw new Error('tags filters are not modelled');
  if (run.ref.startsWith('refs/tags/')) return !push.branches;
  if (push.branches && !push.branches.includes(run.ref.replace('refs/heads/', ''))) return false;
  const paths = push.paths;
  return !paths || run.changed.some((file) => paths.includes(file));
}

function deploys(job: string, run: Run): boolean {
  if (!triggers(run)) return false;
  const condition = workflow.jobs[job].if;
  if (condition === undefined) return true;
  const allowedRef = /^github\.ref == '([^']+)'$/.exec(condition)?.[1];
  if (!allowedRef) throw new Error(`job condition is not modelled: ${condition}`);
  return run.ref === allowedRef;
}

describe('deploy-firestore-rules workflow', () => {
  it.each([
    { ref: 'refs/heads/main', deploysProd: true },
    { ref: 'refs/heads/claude/feature', deploysProd: false },
    { ref: 'refs/tags/v1.0.0', deploysProd: false },
  ])('a push to $ref that changes firestore.rules deploys Prod: $deploysProd', ({ ref, deploysProd }) => {
    expect(deploys('deploy-prod', { event: 'push', ref, changed: ['firestore.rules'] })).toBe(deploysProd);
  });

  it.each([
    { job: 'deploy-prod', ref: 'refs/heads/main', runs: true },
    { job: 'deploy-prod', ref: 'refs/heads/claude/feature', runs: false },
    { job: 'deploy-dev', ref: 'refs/heads/claude/feature', runs: true },
  ])('a manual run from $ref runs $job: $runs', ({ job, ref, runs }) => {
    expect(deploys(job, { event: 'workflow_dispatch', ref })).toBe(runs);
  });
});
