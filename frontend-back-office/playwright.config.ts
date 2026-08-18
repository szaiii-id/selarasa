import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: 0,
  workers: 1,
  reporter: 'html',
  
  use: {
    baseURL: isCI ? 'http://127.0.0.1:5174' : 'http://selarasa:5174',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: isCI ? 'chromium' : 'brave',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: isCI ? {} : { executablePath: '/usr/bin/brave' },
      },
    },
  ],

  webServer: {
    command: isCI ? 'npm run dev -- --host 127.0.0.1 --port 5174' : 'npm run dev',
    url: isCI ? 'http://127.0.0.1:5174' : 'http://selarasa:5174',
    reuseExistingServer: !isCI,
    timeout: 120 * 1000,
    env: {
      VITE_API_BASE_URL: isCI ? 'http://127.0.0.1:8001/api/v1' : 'http://selarasa:8001/api/v1'
    }
  },
});