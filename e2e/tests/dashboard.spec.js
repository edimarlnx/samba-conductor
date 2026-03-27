const {runSuite, runTest, loginAsAdmin, waitForPageReady} = require('./helpers');

async function run(reporter) {
    await runSuite('dashboard', async (browser, reporter) => {
        const page = await browser.newPage();
        await loginAsAdmin(page);

        await runTest(page, reporter, 'dashboard', 'stats-cards', async () => {
            await page.waitForSelector('[data-e2e="dashboard-card-total-users"]', {timeout: 10000});
            await page.waitForSelector('[data-e2e="dashboard-card-active-users"]', {timeout: 5000});
            await page.waitForSelector('[data-e2e="dashboard-card-disabled-users"]', {timeout: 5000});
            await page.waitForSelector('[data-e2e="dashboard-card-groups"]', {timeout: 5000});
        });

        await runTest(page, reporter, 'dashboard', 'status-links', async () => {
            const drLink = await page.$('[data-e2e="dashboard-link-dr-key"]');
            const syncLink = await page.$('[data-e2e="dashboard-link-sync-account"]');
            if (!drLink) throw new Error('DR key status link not found');
            if (!syncLink) throw new Error('Sync account status link not found');
        });

        await page.close();
    }, reporter);
}

module.exports = {run};
