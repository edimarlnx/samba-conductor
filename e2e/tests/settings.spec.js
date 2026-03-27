const {runSuite, runTest, loginAsAdmin, navigateToAdmin, waitForPageReady} = require('./helpers');

async function run(reporter) {
    await runSuite('settings', async (browser, reporter) => {
        const page = await browser.newPage();
        await loginAsAdmin(page);

        await runTest(page, reporter, 'settings', 'page-loads', async () => {
            await navigateToAdmin(page, 'settings');
            await page.waitForSelector('[data-e2e="settings-btn-save-fields"]', {timeout: 10000});
        });

        await runTest(page, reporter, 'settings', 'toggle-feature', async () => {
            // Find a toggle and click it
            const toggles = await page.$$('[data-e2e^="settings-toggle-"]');
            if (toggles.length === 0) throw new Error('No settings toggles found');
            // Toggle first one on then off
            await toggles[0].click();
            await page.waitForTimeout(1000);
            await toggles[0].click();
            await page.waitForTimeout(1000);
        });

        await runTest(page, reporter, 'settings', 'save-fields', async () => {
            await page.click('[data-e2e="settings-btn-save-fields"]');
            await page.waitForTimeout(2000);
        });

        await runTest(page, reporter, 'settings', 'sync-account-section', async () => {
            // Check if sync account config button exists
            const configBtn = await page.$('[data-e2e="settings-btn-configure-sync"]');
            const resetBtn = await page.$('[data-e2e="settings-btn-reset-sync-password"]');
            if (!configBtn && !resetBtn) throw new Error('Sync account section not found');
        });

        await page.close();
    }, reporter);
}

module.exports = {run};
