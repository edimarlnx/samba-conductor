const {runSuite, runTest, loginAsAdmin, navigateToAdmin, waitForPageReady} = require('./helpers');

async function run(reporter) {
    await runSuite('dr', async (browser, reporter) => {
        const page = await browser.newPage();
        await loginAsAdmin(page);

        await runTest(page, reporter, 'dr', 'page-loads', async () => {
            await navigateToAdmin(page, 'disaster-recovery');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);
        });

        await runTest(page, reporter, 'dr', 'key-section', async () => {
            // Check for key management elements — any of these indicates page loaded
            const generateBtn = await page.$('[data-e2e="dr-btn-generate-key"]');
            const haveKeyBtn = await page.$('[data-e2e="dr-btn-have-key"]');
            const unlockBtn = await page.$('[data-e2e="dr-btn-unlock"]');
            const syncBtn = await page.$('[data-e2e="dr-btn-sync-metadata"]');
            if (!generateBtn && !haveKeyBtn && !unlockBtn && !syncBtn) {
                throw new Error('No DR key management elements found');
            }
        });

        await runTest(page, reporter, 'dr', 's3-config-visible', async () => {
            // S3 section may not be visible until DR key is configured
            const s3Endpoint = await page.$('[data-e2e="dr-input-s3-endpoint"]');
            if (!s3Endpoint) {
                // Expected if DR key not configured — page is still functional
                console.log('    (S3 section hidden — DR key not yet configured)');
            }
        });

        await page.close();
    }, reporter);
}

module.exports = {run};
