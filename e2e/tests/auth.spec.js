const {runSuite, runTest, loginAsAdmin, loginAsUser, BASE_URL, ADMIN_USER, ADMIN_PASS, launchBrowser} = require('./helpers');

async function run(reporter) {
    await runSuite('auth', async (browser, reporter) => {
        const page = await browser.newPage();

        await runTest(page, reporter, 'auth', 'login-valid', async () => {
            await loginAsAdmin(page);
            const url = page.url();
            if (!url.includes('/admin')) throw new Error(`Expected /admin, got ${url}`);
        });

        await runTest(page, reporter, 'auth', 'dashboard-loaded', async () => {
            await page.waitForSelector('[data-e2e="dashboard-card-total-users"]', {timeout: 10000});
        });

        await runTest(page, reporter, 'auth', 'logout', async () => {
            await page.click('[data-e2e="admin-btn-logout"]');
            await page.waitForURL('**/login**', {timeout: 10000});
        });

        await runTest(page, reporter, 'auth', 'login-invalid', async () => {
            await page.goto(`${BASE_URL}/login`);
            await page.waitForSelector('[data-e2e="login-input-username"]', {timeout: 10000});
            await page.fill('[data-e2e="login-input-username"]', 'baduser');
            await page.fill('[data-e2e="login-input-password"]', 'badpass');
            await page.click('[data-e2e="login-btn-submit"]');
            await page.waitForSelector('[data-e2e="login-error"]', {timeout: 10000});
        });

        await runTest(page, reporter, 'auth', 'redirect-unauthenticated', async () => {
            await page.goto(`${BASE_URL}/admin`);
            await page.waitForURL('**/login**', {timeout: 10000});
        });

        await page.close();
    }, reporter);
}

module.exports = {run};
