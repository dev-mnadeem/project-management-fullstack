import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    // Node by default; component tests opt into jsdom with a
    // `@vitest-environment jsdom` docblock at the top of the file.
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      include: ['lib/**/*.ts', 'components/**/*.tsx', 'app/api/**/*.ts'],
    },
  },
});
