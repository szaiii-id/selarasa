import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: 0,
  workers: 1,
  reporter: 'html',
  
  use: {
    baseURL: 'http://selarasa:5173',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'brave',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          executablePath: '/usr/bin/brave',
        },
      },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://selarasa:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: {
      VITE_API_BASE_URL: 'http://selarasa:8001/api/v1'
    }
  },
});