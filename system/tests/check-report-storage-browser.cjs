// With Vite running: node tests/check-report-storage-browser.cjs
// Override CHROME_BIN or REPORT_TEST_ORIGIN when needed.
const { spawnSync } = require('node:child_process');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const profile = mkdtempSync(join(tmpdir(), 'report-browser-'));
try {
  const result = spawnSync(process.env.CHROME_BIN || '/opt/google/chrome/chrome', [
    '--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    `--user-data-dir=${profile}`, '--dump-dom', '--virtual-time-budget=15000',
    `${process.env.REPORT_TEST_ORIGIN || 'http://localhost:5173'}/tests/report-storage.html`,
  ], { encoding: 'utf8', timeout: 30000, maxBuffer: 4 * 1024 * 1024 });
  const status = result.stdout?.match(/<pre id="result">([^<]*)<\/pre>/)?.[1];
  if (result.error || result.status !== 0 || !status?.startsWith('PASS:')) {
    console.error(status || result.error?.message || 'Browser test did not complete');
    process.exitCode = 1;
  } else console.log(status);
} finally {
  rmSync(profile, { recursive: true, force: true });
}
