import { defineConfig, mergeConfig } from 'vitest/config';
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
      },
    }
  );
});
