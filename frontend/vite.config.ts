import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/three-js-mini-solar-system/',
  test: {
    environment: 'node',
    restoreMocks: true,
    clearMocks: true,
    unstubEnvs: true,
  },
});
