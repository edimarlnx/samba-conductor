const {runSuite, runTest, loginAsAdmin, navigateToAdmin, confirmModal, BASE_URL, LDAP_TIMEOUT, LDAP_ACTION_TIMEOUT} = require('./helpers');

const TEST_SA = 'e2etestsa';
const TABLE_SELECTOR = '[data-e2e="service-accounts-table-search"]';

async function run(reporter) {
    await runSuite('service-accounts', async (browser, reporter) => {
        const page = await browser.newPage();
        await loginAsAdmin(page);

        await runTest(page, reporter, 'service-accounts', 'list-accounts', async () => {
            await navigateToAdmin(page, 'service-accts');
            await page.waitForSelector(TABLE_SELECTOR, {timeout: LDAP_TIMEOUT});
        });

        await runTest(page, reporter, 'service-accounts', 'create-account', async () => {
            await page.click('[data-e2e="service-accounts-btn-new"]');
            await page.waitForSelector('[data-e2e="service-accounts-create-input-name"]', {timeout: 5000});
            await page.fill('[data-e2e="service-accounts-create-input-name"]', TEST_SA);
            await page.fill('[data-e2e="service-accounts-create-input-dns-hostname"]', 'e2etest.samdom.example.com');
            await page.click('[data-e2e="service-accounts-create-btn-submit"]');
            await page.waitForTimeout(5000);
            // If modal still open, close it and reload
            const inputStillVisible = await page.$('[data-e2e="service-accounts-create-input-name"]');
            if (inputStillVisible) {
                await page.keyboard.press('Escape');
                await page.waitForTimeout(500);
            }
            await page.goto(`${BASE_URL}/admin/service-accounts`);
            await page.waitForSelector(TABLE_SELECTOR, {timeout: LDAP_TIMEOUT});
        });

        await runTest(page, reporter, 'service-accounts', 'verify-created', async () => {
            await page.waitForSelector(`text=${TEST_SA}`, {timeout: LDAP_TIMEOUT});
        });

        await runTest(page, reporter, 'service-accounts', 'view-details', async () => {
            const rows = await page.$$('tr');
            for (const row of rows) {
                const text = await row.evaluate(el => el.textContent);
                if (text.toLowerCase().includes(TEST_SA)) {
                    const btn = await row.$('[data-e2e="service-accounts-btn-details"]');
                    if (btn) await btn.click();
                    break;
                }
            }
            await page.waitForSelector('[data-e2e="service-accounts-detail-btn-close"]', {timeout: 10000});
            await page.click('[data-e2e="service-accounts-detail-btn-close"]');
            await page.waitForTimeout(500);
        });

        await runTest(page, reporter, 'service-accounts', 'delete-account', async () => {
            const rows = await page.$$('tr');
            for (const row of rows) {
                const text = await row.evaluate(el => el.textContent);
                if (text.toLowerCase().includes(TEST_SA)) {
                    const btn = await row.$('[data-e2e="service-accounts-btn-delete"]');
                    if (btn) await btn.click();
                    break;
                }
            }
            await confirmModal(page, 'service-accounts-delete');
            await page.waitForTimeout(5000);
        });

        await page.close();
    }, reporter);
}

module.exports = {run};
