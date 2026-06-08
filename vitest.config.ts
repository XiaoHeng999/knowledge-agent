import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'server/**/*.test.ts', 'electron/**/*.test.ts'],
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@electron': path.resolve(__dirname, './electron'),
      '@server': path.resolve(__dirname, './server'),
    },
  },
});
