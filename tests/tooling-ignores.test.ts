import { describe, it, expect } from 'vitest';
import { spawnSync } from 'child_process';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { ESLint } from 'eslint';

// The Claude desktop app keeps git worktrees (full copies of the repo on other branches) in .claude/worktrees/.
// Test and lint runs in the main checkout must not pick them up.
const root = resolve(__dirname, '..');

describe('tooling ignores .claude/', () => {
  it('vitest does not collect test files under .claude/', () => {
    // A probe test file, so this works without any real worktree (e.g. in CI).
    const probeDir = join(root, '.claude', `vitest-ignore-probe-${process.pid}`);
    mkdirSync(probeDir, { recursive: true });
    writeFileSync(join(probeDir, 'probe.test.ts'), "import { it } from 'vitest';\nit('probe', () => {});\n");
    try {
      // Same file discovery as `vitest run`, using this project's config.
      const result = spawnSync(process.execPath, ['--input-type=module', '-e', `
        import { createVitest } from 'vitest/node';
        const ctx = await createVitest('test', { watch: false });
        const specs = await ctx.globTestFiles();
        // Vitest 1 returns [project, file] tuples; Vitest 2+ returns TestSpecification objects.
        console.log(JSON.stringify(specs.map((spec) => spec.moduleId ?? spec[1] ?? spec)));
        await ctx.close();
      `], { cwd: root, encoding: 'utf8' });
      const files: string[] = JSON.parse(result.stdout.trim().split('\n').pop() ?? '[]');

      expect(files.length).toBeGreaterThan(0);
      expect(files.filter((file) => file.includes('/.claude/'))).toEqual([]);
    } finally {
      rmSync(probeDir, { recursive: true, force: true });
    }
  });

  it('eslint ignores files under .claude/', async () => {
    // Uses this project's eslint.config.js; the path does not need to exist.
    const eslint = new ESLint({ cwd: root });

    expect(await eslint.isPathIgnored(join(root, '.claude', 'worktrees', 'some-branch', 'src', 'App.tsx'))).toBe(true);
  });
});
