const {runSuite, runTest, loginAsAdmin, navigateToAdmin, waitForPageReady} = require('./helpers');

async function run(reporter) {
    await runSuite('domain', async (browser, reporter) => {
        const page = await browser.newPage();
        await loginAsAdmin(page);

        await runTest(page, reporter, 'domain', 'info-section', async () => {
            await navigateToAdmin(page, 'domain');
            await page.waitForSelector('[data-e2e="domain-section-info"]', {timeout: 10000});
        });

        await runTest(page, reporter, 'domain', 'functional-levels', async () => {
            await page.waitForSelector('[data-e2e="domain-section-levels"]', {timeout: 10000});
        });

        await page.close();
    }, reporter);
}

module.exports = {run};
