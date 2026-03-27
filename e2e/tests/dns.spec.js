const {runSuite, runTest, loginAsAdmin, navigateToAdmin, confirmModal, LDAP_TIMEOUT, LDAP_ACTION_TIMEOUT} = require('./helpers');

const TEST_RECORD_NAME = 'e2etest';

async function run(reporter) {
    await runSuite('dns', async (browser, reporter) => {
        const page = await browser.newPage();
        await loginAsAdmin(page);

        await runTest(page, reporter, 'dns', 'page-loads', async () => {
            await navigateToAdmin(page, 'dns');
            // DNS zones load asynchronously from LDAP — wait for heading
            await page.waitForSelector('h1:has-text("DNS")', {timeout: 15000});
            // Wait extra time for zone data to load
            await page.waitForTimeout(10000);
        });

        await runTest(page, reporter, 'dns', 'view-zones', async () => {
            const zoneBtns = await page.$$('[data-e2e="dns-btn-zone"]');
            if (zoneBtns.length === 0) {
                // Zones may still be loading — wait more
                await page.waitForSelector('[data-e2e="dns-btn-zone"]', {timeout: LDAP_TIMEOUT});
            }
        });

        await runTest(page, reporter, 'dns', 'expand-zone', async () => {
            const zoneBtns = await page.$$('[data-e2e="dns-btn-zone"]');
            if (zoneBtns.length === 0) throw new Error('No DNS zones found');
            await zoneBtns[0].click();
            await page.waitForTimeout(5000);
        });

        await runTest(page, reporter, 'dns', 'add-record', async () => {
            await page.waitForSelector('[data-e2e="dns-btn-add-record"]', {timeout: LDAP_TIMEOUT});
            await page.click('[data-e2e="dns-btn-add-record"]');
            await page.waitForSelector('[data-e2e="dns-add-input-name"]', {timeout: 5000});
            await page.fill('[data-e2e="dns-add-input-name"]', TEST_RECORD_NAME);
            await page.selectOption('[data-e2e="dns-add-select-type"]', 'A');
            await page.fill('[data-e2e="dns-add-input-data"]', '10.0.0.99');
            await page.click('[data-e2e="dns-add-btn-submit"]');
            await page.waitForTimeout(10000);
        });

        await runTest(page, reporter, 'dns', 'delete-record', async () => {
            const deleteBtns = await page.$$('[data-e2e="dns-btn-delete-record"]');
            if (deleteBtns.length > 0) {
                await deleteBtns[deleteBtns.length - 1].click();
                await confirmModal(page, 'dns-delete-record');
                await page.waitForTimeout(5000);
            }
        });

        await page.close();
    }, reporter);
}

module.exports = {run};
