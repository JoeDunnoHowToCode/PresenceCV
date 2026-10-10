import { configDefaults, defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default defineConfig(async (configEnv) => {
  const viteConf = typeof viteConfig === 'function' ? await viteConfig(configEnv) : viteConfig;
  
  return mergeConfig(
    viteConf,
    {
      test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/setupTests.ts'],
        // .claude/worktrees/ holds full repo copies on other branches (Claude desktop app).
        exclude: [...configDefaults.exclude, '.claude/**'],
      },
    }
  );
});
