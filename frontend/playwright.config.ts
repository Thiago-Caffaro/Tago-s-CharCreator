import { defineConfig } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import os from 'node:os'

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const testDataDir = path.join(os.tmpdir(), 'tagos-charcreator-playwright-e2e')
fs.mkdirSync(testDataDir, { recursive: true })
const testDatabase = path.join(testDataDir, 'e2e.db').replace(/\\/g, '/')

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'mobile-360', use: { viewport: { width: 360, height: 800 } } },
    { name: 'mobile-390', use: { viewport: { width: 390, height: 844 } } },
    { name: 'tablet', use: { viewport: { width: 768, height: 1024 }, hasTouch: true } },
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
  ],
  webServer: [
    {
      command: 'backend\\venv\\Scripts\\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000',
      cwd: repositoryRoot,
      url: 'http://127.0.0.1:8000/api/health',
      reuseExistingServer: false,
      env: {
        ...process.env,
        DATABASE_URL: `sqlite:///${testDatabase}`,
        APP_SECRET_FILE: path.join(testDataDir, 'app.secret'),
        INITIAL_ADMIN_USERNAME: 'e2e-admin',
        INITIAL_ADMIN_PASSWORD: 'e2e-password',
        OPENROUTER_API_KEY: '',
      },
    },
    {
      command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1',
      cwd: path.resolve(repositoryRoot, 'frontend'),
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: false,
    },
  ],
})
