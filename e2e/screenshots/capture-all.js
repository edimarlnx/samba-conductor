const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const config = require('../playwright.config');

const SCREENSHOT_DIR = config.SCREENSHOT_DIR;
const TEMP_DIR = path.join(SCREENSHOT_DIR, '.tmp');

// All screenshot definitions — add new pages here
const SCREENSHOTS = [
  { name: 'login-empty', group: 'auth', capture: captureLoginEmpty },
  { name: 'login', group: 'auth', capture: captureLoginFilled },
  { name: 'admin-dashboard', group: 'admin', capture: captureDashboard },
  { name: 'admin-users', group: 'admin', capture: captureUsers },
  { name: 'admin-user-create', group: 'admin', capture: captureUserCreate },
  { name: 'admin-groups', group: 'admin', capture: captureGroups },
  { name: 'admin-ous', group: 'admin', capture: captureOUs },
  { name: 'admin-computers', group: 'admin', capture: captureComputers },
  { name: 'admin-service-accounts', group: 'admin', capture: captureServiceAccounts },
  { name: 'admin-dns', group: 'admin', capture: captureDNS },
  { name: 'admin-gpos', group: 'admin', capture: captureGPOs },
  { name: 'admin-domain', group: 'admin', capture: captureDomain },
    {name: 'admin-oauth-clients', group: 'admin', capture: captureOAuthClients},
    {name: 'admin-oauth-realms', group: 'admin', capture: captureOAuthRealms},
  { name: 'admin-settings', group: 'admin', capture: captureSettings },
  { name: 'admin-dr', group: 'admin', capture: captureDR },
  { name: 'selfservice-home', group: 'selfservice', capture: captureSelfServiceHome },
  { name: 'selfservice-profile', group: 'selfservice', capture: captureSelfServiceProfile },
  { name: 'selfservice-change-password', group: 'selfservice', capture: captureSelfServiceChangePassword },
];

function fileHash({ filePath }) {
  if (!fs.existsSync(filePath)) return null;
  const data = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(data).digest('hex');
}

function parseArgs() {
  const args = process.argv.slice(2);
  const filter = args.find((a) => !a.startsWith('--'));
  const forceAll = args.includes('--force');
  return { filter, forceAll };
}

async function main() {
  const { filter, forceAll } = parseArgs();

  // Determine which screenshots to capture
  let targets = SCREENSHOTS;
  if (filter) {
    targets = SCREENSHOTS.filter(
      (s) => s.name.includes(filter) || s.group === filter
    );
    if (targets.length === 0) {
      console.error(`No screenshots match filter: "${filter}"`);
      console.log('Available:', SCREENSHOTS.map((s) => s.name).join(', '));
      process.exit(1);
    }
  }

  console.log(`Capturing ${targets.length} screenshot(s)...`);

  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  fs.mkdirSync(TEMP_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: config.VIEWPORT });
  const page = await context.newPage();

  // Login once
  let loggedIn = false;
  async function ensureLoggedIn() {
    if (loggedIn) return;
    await page.goto(config.BASE_URL);
    await page.waitForSelector('[data-e2e="login-input-username"]');
    await page.fill('[data-e2e="login-input-username"]', config.CREDENTIALS.admin.username);
    await page.fill('[data-e2e="login-input-password"]', config.CREDENTIALS.admin.password);
    await page.click('[data-e2e="login-btn-submit"]');
    await page.waitForURL('**/admin**', { timeout: 15000 });
    loggedIn = true;
  }

  const results = { updated: [], unchanged: [], failed: [] };

  for (const target of targets) {
    try {
      // Capture to temp file
      const tempPath = path.join(TEMP_DIR, `${target.name}.png`);
      const finalPath = path.join(SCREENSHOT_DIR, `${target.name}.png`);

      await target.capture({ page, ensureLoggedIn, tempPath });

      // Compare with existing
      const oldHash = fileHash({ filePath: finalPath });
      const newHash = fileHash({ filePath: tempPath });

      if (forceAll || oldHash !== newHash) {
        fs.copyFileSync(tempPath, finalPath);
        const status = oldHash ? 'updated' : 'new';
        console.log(`  [${status}] ${target.name}.png`);
        results.updated.push(target.name);
      } else {
        console.log(`  [unchanged] ${target.name}.png`);
        results.unchanged.push(target.name);
      }
    } catch (err) {
      console.error(`  [FAILED] ${target.name}: ${err.message}`);
      results.failed.push(target.name);
    }
  }

  // Cleanup temp
  fs.rmSync(TEMP_DIR, { recursive: true, force: true });

  await browser.close();

  // Summary
  console.log('\n--- Summary ---');
  console.log(`Updated: ${results.updated.length}`);
  console.log(`Unchanged: ${results.unchanged.length}`);
  if (results.failed.length > 0) {
    console.log(`Failed: ${results.failed.length} (${results.failed.join(', ')})`);
  }
  if (results.updated.length > 0) {
    console.log('\nChanged files:');
    results.updated.forEach((name) => console.log(`  docs/screenshots/${name}.png`));
  }
}

// --- Capture functions ---

async function captureLoginEmpty({ page, tempPath }) {
  await page.goto(config.BASE_URL);
  await page.waitForSelector('[data-e2e="login-input-username"]');
  await page.screenshot({ path: tempPath, fullPage: false });
}

async function captureLoginFilled({ page, tempPath }) {
  await page.goto(config.BASE_URL);
  await page.waitForSelector('[data-e2e="login-input-username"]');
  await page.fill('[data-e2e="login-input-username"]', config.CREDENTIALS.admin.username);
  await page.fill('[data-e2e="login-input-password"]', config.CREDENTIALS.admin.password);
  await page.screenshot({ path: tempPath, fullPage: false });
}

async function captureDashboard({ page, ensureLoggedIn, tempPath }) {
  await ensureLoggedIn();
  await page.click('[data-e2e="admin-sidebar-link-dashboard"]');
  await page.waitForSelector('[data-e2e="dashboard-card-total-users"]', { timeout: 10000 });
  await page.screenshot({ path: tempPath, fullPage: false });
}

async function captureUsers({ page, ensureLoggedIn, tempPath }) {
  await ensureLoggedIn();
  await page.click('[data-e2e="admin-sidebar-link-users"]');
  await page.waitForSelector('[data-e2e="users-btn-new"]', { timeout: 10000 });
  await page.screenshot({ path: tempPath, fullPage: false });
}

async function captureUserCreate({ page, ensureLoggedIn, tempPath }) {
  await ensureLoggedIn();
  await page.goto(`${config.BASE_URL}/admin/users/new`);
  await page.waitForSelector('[data-e2e="user-form-input-username"]', { timeout: 10000 });
  await page.screenshot({ path: tempPath, fullPage: false });
}

async function captureGroups({ page, ensureLoggedIn, tempPath }) {
  await ensureLoggedIn();
  await page.click('[data-e2e="admin-sidebar-link-groups"]');
  await page.waitForSelector('[data-e2e="groups-btn-new"]', { timeout: 10000 });
  await page.screenshot({ path: tempPath, fullPage: false });
}

async function captureOUs({ page, ensureLoggedIn, tempPath }) {
  await ensureLoggedIn();
  await page.click('[data-e2e="admin-sidebar-link-ous"]');
  await page.waitForSelector('[data-e2e="ous-btn-new"]', { timeout: 10000 });
  await page.screenshot({ path: tempPath, fullPage: false });
}

async function captureComputers({ page, ensureLoggedIn, tempPath }) {
  await ensureLoggedIn();
  await page.click('[data-e2e="admin-sidebar-link-computers"]');
  await page.waitForSelector('[data-e2e="computers-btn-new"]', { timeout: 10000 });
  await page.screenshot({ path: tempPath, fullPage: false });
}

async function captureServiceAccounts({ page, ensureLoggedIn, tempPath }) {
  await ensureLoggedIn();
  await page.click('[data-e2e="admin-sidebar-link-service-accts"]');
  await page.waitForSelector('[data-e2e="service-accounts-btn-new"]', { timeout: 10000 });
  await page.screenshot({ path: tempPath, fullPage: false });
}

async function captureDNS({ page, ensureLoggedIn, tempPath }) {
  await ensureLoggedIn();
  await page.click('[data-e2e="admin-sidebar-link-dns"]');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: tempPath, fullPage: false });
}

async function captureGPOs({ page, ensureLoggedIn, tempPath }) {
  await ensureLoggedIn();
  await page.click('[data-e2e="admin-sidebar-link-gpos"]');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: tempPath, fullPage: false });
}

async function captureDomain({ page, ensureLoggedIn, tempPath }) {
  await ensureLoggedIn();
  await page.click('[data-e2e="admin-sidebar-link-domain"]');
  await page.waitForSelector('[data-e2e="domain-section-info"]', { timeout: 10000 });
  await page.screenshot({ path: tempPath, fullPage: false });
}

async function captureSettings({ page, ensureLoggedIn, tempPath }) {
  await ensureLoggedIn();
  await page.click('[data-e2e="admin-sidebar-link-settings"]');
  await page.waitForSelector('[data-e2e="settings-btn-save-fields"]', { timeout: 10000 });
  await page.screenshot({ path: tempPath, fullPage: false });
}

async function captureOAuthClients({page, ensureLoggedIn, tempPath}) {
    await ensureLoggedIn();
    await page.click('[data-e2e="admin-sidebar-link-clients"]');
    await page.waitForTimeout(2000);
    await page.screenshot({path: tempPath, fullPage: false});
}

async function captureOAuthRealms({page, ensureLoggedIn, tempPath}) {
    await ensureLoggedIn();
    await page.click('[data-e2e="admin-sidebar-link-realms"]');
    await page.waitForTimeout(2000);
    await page.screenshot({path: tempPath, fullPage: false});
}

async function captureDR({ page, ensureLoggedIn, tempPath }) {
  await ensureLoggedIn();
  await page.click('[data-e2e="admin-sidebar-link-disaster-recovery"]');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: tempPath, fullPage: false });
}

async function captureSelfServiceHome({ page, ensureLoggedIn, tempPath }) {
  await ensureLoggedIn();
  await page.goto(`${config.BASE_URL}/`);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: tempPath, fullPage: false });
}

async function captureSelfServiceProfile({ page, ensureLoggedIn, tempPath }) {
  await ensureLoggedIn();
  await page.goto(`${config.BASE_URL}/profile`);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: tempPath, fullPage: false });
}

async function captureSelfServiceChangePassword({ page, ensureLoggedIn, tempPath }) {
  await ensureLoggedIn();
  await page.goto(`${config.BASE_URL}/change-password`);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: tempPath, fullPage: false });
}

main().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
