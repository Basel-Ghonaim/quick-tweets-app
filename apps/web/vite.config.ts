import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import { configDefaults } from 'vitest/config';
const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  plugins: [react({
    babel: {
      plugins: [['babel-plugin-react-compiler']]
    }
  })],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, './src/shared'),
      '@modules': path.resolve(__dirname, './src/modules'),
      '@features': path.resolve(__dirname, './src/features'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@app': path.resolve(__dirname, './src/app')
    }
  },
  test: {
    // A branch that stops being rendered drops a floor and fails the lane; the
    // numbers are a ratchet, not a target (see docs/development/testing-topology.md).
    coverage: {
      provider: 'v8',
      enabled: false,
      reporter: ['text'],
      include: ['src/modules/auth/screens/**/*.tsx', 'src/pages/auth/screens/**/*.tsx', 'src/features/recovery/screens/**/*.tsx'],
      exclude: ['**/*.stories.tsx', '**/*.component.test.tsx'],
      thresholds: {
        'src/pages/auth/screens/Verify/VerifyAsk.tsx': { branches: 82 },
        'src/pages/auth/screens/Verify/VerifyCode.tsx': { branches: 91 },
        'src/pages/auth/screens/Profile/Profile.tsx': { branches: 92 },
        'src/modules/auth/screens/Onboarding/Onboarding.tsx': { branches: 63 },
        'src/features/recovery/screens/Recovery.tsx': { branches: 64 },
        'src/features/recovery/screens/steps/RecoveryRequest.tsx': { branches: 87 },
        'src/features/recovery/screens/steps/RecoveryCode.tsx': { branches: 98 },
        'src/features/recovery/screens/steps/RecoveryPassword.tsx': { branches: 82 },
        'src/features/recovery/screens/steps/StepLayout.tsx': { branches: 80 },
      },
    },
    projects: [
      {
        // Outcomes that depend only on inputs. No DOM, so a test that must
        // mount belongs to the component project below.
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.{test,spec}.{ts,tsx}'],
          exclude: [...configDefaults.exclude, 'src/**/*.component.test.tsx'],
        },
      },
      {
        // Outcomes that depend on a renderer's lifecycle. A renderer, not a
        // browser: anything needing paint belongs to the storybook project.
        extends: true,
        test: {
          name: 'component',
          environment: 'jsdom',
          include: ['src/**/*.component.test.tsx'],
          setupFiles: ['./vitest.component.setup.ts'],
        },
      },
      {
      extends: true,
      plugins: [
      // The plugin will run tests for the stories defined in your Storybook config
      // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
      storybookTest({
        configDir: path.join(dirname, '.storybook')
      })],
      test: {
        name: 'storybook',
        setupFiles: ['./.storybook/domValidity.ts'],
        browser: {
          enabled: true,
          headless: true,
          provider: playwright({}),
          instances: [{
            browser: 'chromium'
          }]
        }
      }
    }]
  }
});