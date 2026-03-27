const {chromium} = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = process.env.BASE_URL || 'http://localhost:4080';
const ADMIN_USER = 'Administrator';
const ADMIN_PASS = 'P@ssw0rd123!';
const RESULTS_DIR = path.resolve(__dirname, '..', 'results');
const SCREENSHOTS_DIR = path.resolve(RESULTS_DIR, 'screenshots');

// LDAP operations can be slow — use generous timeouts
const LDAP_TIMEOUT = 60000;      // 60s for LDAP data loading
const LDAP_ACTION_TIMEOUT = 45000; // 45s for LDAP write operations (create/edit/delete)
const UI_TIMEOUT = 10000;         // 10s for pure UI interactions

// Ensure results directories exist
fs.mkdirSync(SCREENSHOTS_DIR, {recursive: true});

async function launchBrowser() {
    return chromium.launch({args: ['--no-sandbox']});
}

async function loginAsAdmin(page) {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForSelector('[data-e2e="login-input-username"]', {timeout: 15000});
    await page.fill('[data-e2e="login-input-username"]', ADMIN_USER);
    await page.fill('[data-e2e="login-input-password"]', ADMIN_PASS);
    await page.click('[data-e2e="login-btn-submit"]');
    await page.waitForURL('**/admin**', {timeout: 15000});
}

async function loginAsUser(page, username, password) {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForSelector('[data-e2e="login-input-username"]', {timeout: 15000});
    await page.fill('[data-e2e="login-input-username"]', username);
    await page.fill('[data-e2e="login-input-password"]', password);
    await page.click('[data-e2e="login-btn-submit"]');
}

async function navigateToAdmin(page, section) {
    const pathMap = {
        'dashboard': '**/admin',
        'users': '**/admin/users**',
        'groups': '**/admin/groups**',
        'ous': '**/admin/ous**',
        'computers': '**/admin/computers**',
        'service-accts': '**/admin/service-accounts**',
        'dns': '**/admin/dns**',
        'gpos': '**/admin/gpos**',
        'domain': '**/admin/domain**',
        'clients': '**/admin/oauth/clients**',
        'realms': '**/admin/oauth/realms**',
        'settings': '**/admin/settings**',
        'disaster-recovery': '**/admin/dr**',
    };
    await page.click(`[data-e2e="admin-sidebar-link-${section}"]`);
    await page.waitForURL(pathMap[section] || '**/admin/**', {timeout: 15000});
    // Don't wait for networkidle — LDAP data loads async via Meteor methods
    await page.waitForTimeout(500);
}

async function waitForPageReady(page, timeout = LDAP_TIMEOUT) {
    await page.waitForLoadState('networkidle', {timeout});
}

async function takeScreenshot(page, suite, testName, status) {
    const filename = `${suite}-${testName}-${status}.png`;
    const filepath = path.resolve(SCREENSHOTS_DIR, filename);
    await page.screenshot({path: filepath, fullPage: true});
    return filename;
}

async function confirmModal(page, dataE2e = 'confirm-modal') {
    await page.waitForSelector(`[data-e2e="${dataE2e}-modal"]`, {timeout: UI_TIMEOUT});
    await page.click(`[data-e2e="${dataE2e}-btn-confirm"]`);
    await page.waitForTimeout(1000);
}

// Wait for an inline modal to close after a LDAP operation
async function waitForModalClose(page, inputSelector, timeout = LDAP_ACTION_TIMEOUT) {
    await page.waitForSelector(inputSelector, {state: 'hidden', timeout});
}

// TestReporter accumulates results and generates report.html
class TestReporter {
    constructor() {
        this.suites = {};
        this.startTime = Date.now();
    }

    addResult(suite, testName, passed, screenshot, error) {
        if (!this.suites[suite]) this.suites[suite] = [];
        this.suites[suite].push({testName, passed, screenshot, error, timestamp: new Date().toISOString()});
    }

    get totalTests() {
        return Object.values(this.suites).reduce((sum, tests) => sum + tests.length, 0);
    }

    get passedTests() {
        return Object.values(this.suites).reduce((sum, tests) => sum + tests.filter(t => t.passed).length, 0);
    }

    get failedTests() {
        return this.totalTests - this.passedTests;
    }

    generateReport() {
        const duration = ((Date.now() - this.startTime) / 1000).toFixed(1);
        const allPassed = this.failedTests === 0;
        const date = new Date().toISOString();
        const passRate = this.totalTests > 0 ? ((this.passedTests / this.totalTests) * 100).toFixed(1) : '0';

        // Build suite HTML blocks
        let suitesHtml = '';
        for (const [suite, tests] of Object.entries(this.suites)) {
            const suitePassed = tests.every(t => t.passed);
            const suitePassCount = tests.filter(t => t.passed).length;
            const suiteBadge = suitePassed
                ? '<span class="badge pass">PASS</span>'
                : '<span class="badge fail">FAIL</span>';

            let rowsHtml = '';
            for (const t of tests) {
                const statusClass = t.passed ? 'pass' : 'fail';
                const statusText = t.passed ? 'PASS' : 'FAIL';
                const screenshotHtml = t.screenshot
                    ? `<a href="screenshots/${t.screenshot}" target="_blank" class="screenshot-link">
                         <img src="screenshots/${t.screenshot}" alt="${t.testName}" loading="lazy"/>
                       </a>`
                    : '-';
                const errorHtml = t.error
                    ? `<div class="error-msg">${escapeHtml(t.error.substring(0, 150))}</div>`
                    : '';

                rowsHtml += `
              <tr>
                <td class="test-name">${escapeHtml(t.testName)}${errorHtml}</td>
                <td class="status"><span class="badge ${statusClass}">${statusText}</span></td>
                <td class="screenshot">${screenshotHtml}</td>
              </tr>`;
            }

            suitesHtml += `
          <div class="suite">
            <div class="suite-header" onclick="this.parentElement.classList.toggle('collapsed')">
              <h2>${suiteBadge} ${escapeHtml(suite)} <span class="suite-count">${suitePassCount}/${tests.length}</span></h2>
              <span class="toggle-icon">&#9660;</span>
            </div>
            <table class="suite-table">
              <thead><tr><th>Test</th><th>Status</th><th>Screenshot</th></tr></thead>
              <tbody>${rowsHtml}</tbody>
            </table>
          </div>`;
        }

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>E2E Test Report — Samba Conductor</title>
  <style>
    :root {
      --bg: #1a1020; --surface: #251830; --border: #3a2848;
      --fg: #f0e6f6; --fg2: #b8a0c8; --fg3: #7a6888;
      --pass-bg: #1a3a2a; --pass-fg: #4ade80; --pass-border: #2a5a3a;
      --fail-bg: #3a1a1a; --fail-fg: #f87171; --fail-border: #5a2a2a;
      --accent: #c084fc;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: var(--bg); color: var(--fg); padding: 24px; max-width: 1200px; margin: 0 auto; }
    h1 { font-size: 24px; margin-bottom: 4px; }
    .subtitle { color: var(--fg3); font-size: 14px; margin-bottom: 24px; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 32px; }
    .summary-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 16px; text-align: center; }
    .summary-card .value { font-size: 28px; font-weight: 700; }
    .summary-card .label { font-size: 12px; color: var(--fg3); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }
    .summary-card.pass .value { color: var(--pass-fg); }
    .summary-card.fail .value { color: var(--fail-fg); }
    .summary-card.total .value { color: var(--accent); }
    .overall-status { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 16px 24px; margin-bottom: 32px; display: flex; align-items: center; gap: 16px; }
    .overall-status.passed { border-color: var(--pass-border); background: var(--pass-bg); }
    .overall-status.failed { border-color: var(--fail-border); background: var(--fail-bg); }
    .overall-status .status-icon { font-size: 32px; }
    .overall-status .status-text { font-size: 18px; font-weight: 600; }
    .overall-status .status-detail { font-size: 13px; color: var(--fg2); }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .badge.pass { background: var(--pass-bg); color: var(--pass-fg); border: 1px solid var(--pass-border); }
    .badge.fail { background: var(--fail-bg); color: var(--fail-fg); border: 1px solid var(--fail-border); }
    .suite { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; margin-bottom: 12px; overflow: hidden; }
    .suite-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; cursor: pointer; user-select: none; }
    .suite-header:hover { background: rgba(255,255,255,0.03); }
    .suite-header h2 { font-size: 15px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
    .suite-count { color: var(--fg3); font-weight: 400; font-size: 13px; }
    .toggle-icon { color: var(--fg3); font-size: 12px; transition: transform 0.2s; }
    .suite.collapsed .suite-table { display: none; }
    .suite.collapsed .toggle-icon { transform: rotate(-90deg); }
    .suite-table { width: 100%; border-collapse: collapse; }
    .suite-table th { text-align: left; padding: 8px 16px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--fg3); border-top: 1px solid var(--border); background: rgba(0,0,0,0.15); }
    .suite-table td { padding: 10px 16px; border-top: 1px solid var(--border); font-size: 13px; vertical-align: top; }
    .test-name { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 12px; }
    .error-msg { margin-top: 4px; padding: 4px 8px; background: var(--fail-bg); border: 1px solid var(--fail-border); border-radius: 4px; font-size: 11px; color: var(--fail-fg); word-break: break-all; }
    .status { width: 80px; text-align: center; }
    .screenshot { width: 320px; }
    .screenshot-link img { max-width: 300px; border-radius: 8px; border: 1px solid var(--border); transition: transform 0.2s; cursor: zoom-in; }
    .screenshot-link img:hover { transform: scale(1.02); border-color: var(--accent); }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid var(--border); font-size: 12px; color: var(--fg3); text-align: center; }
    @media (max-width: 768px) {
      .screenshot { width: auto; }
      .screenshot-link img { max-width: 100%; }
      .summary { grid-template-columns: repeat(2, 1fr); }
    }
  </style>
</head>
<body>
  <h1>E2E Test Report</h1>
  <p class="subtitle">Samba Conductor &mdash; ${escapeHtml(date)}</p>

  <div class="overall-status ${allPassed ? 'passed' : 'failed'}">
    <div class="status-icon">${allPassed ? '&#10004;' : '&#10008;'}</div>
    <div>
      <div class="status-text">${allPassed ? 'All Tests Passed' : 'Some Tests Failed'}</div>
      <div class="status-detail">${this.passedTests}/${this.totalTests} passed (${passRate}%) in ${duration}s</div>
    </div>
  </div>

  <div class="summary">
    <div class="summary-card total"><div class="value">${this.totalTests}</div><div class="label">Total</div></div>
    <div class="summary-card pass"><div class="value">${this.passedTests}</div><div class="label">Passed</div></div>
    <div class="summary-card fail"><div class="value">${this.failedTests}</div><div class="label">Failed</div></div>
    <div class="summary-card"><div class="value">${duration}s</div><div class="label">Duration</div></div>
  </div>

  ${suitesHtml}

  <div class="footer">
    Base URL: ${escapeHtml(BASE_URL)} &bull; Browser: Chromium (Playwright) &bull; Generated by Samba Conductor E2E Runner
  </div>
</body>
</html>`;

        const reportPath = path.resolve(RESULTS_DIR, 'report.html');
        fs.writeFileSync(reportPath, html);
        return reportPath;
    }
}

function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Run a single test with screenshot capture
async function runTest(page, reporter, suite, testName, testFn) {
    try {
        await testFn();
        const screenshot = await takeScreenshot(page, suite, testName, 'success');
        reporter.addResult(suite, testName, true, screenshot);
        console.log(`  [PASS] ${testName}`);
        return true;
    } catch (error) {
        let screenshot;
        try {
            screenshot = await takeScreenshot(page, suite, testName, 'FAIL');
        } catch (_) { /* ignore screenshot errors */ }
        reporter.addResult(suite, testName, false, screenshot, error.message);
        console.error(`  [FAIL] ${testName}: ${error.message}`);
        return false;
    }
}

// Run a test suite (function that receives browser, reporter)
async function runSuite(suiteName, suiteFn, reporter) {
    console.log(`\n=== Suite: ${suiteName} ===`);
    const browser = await launchBrowser();
    try {
        await suiteFn(browser, reporter);
    } catch (error) {
        console.error(`  [SUITE ERROR] ${suiteName}: ${error.message}`);
        reporter.addResult(suiteName, 'suite-setup', false, null, error.message);
    } finally {
        await browser.close();
    }
}

module.exports = {
    BASE_URL,
    ADMIN_USER,
    ADMIN_PASS,
    RESULTS_DIR,
    SCREENSHOTS_DIR,
    LDAP_TIMEOUT,
    LDAP_ACTION_TIMEOUT,
    UI_TIMEOUT,
    launchBrowser,
    loginAsAdmin,
    loginAsUser,
    navigateToAdmin,
    waitForPageReady,
    takeScreenshot,
    confirmModal,
    waitForModalClose,
    TestReporter,
    runTest,
    runSuite,
};
