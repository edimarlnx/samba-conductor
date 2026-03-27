const {runSuite, runTest, loginAsAdmin, navigateToAdmin, confirmModal, BASE_URL, LDAP_TIMEOUT, LDAP_ACTION_TIMEOUT} = require('./helpers');

const TEST_COMPUTER = 'E2ETESTPC';
const TABLE_SELECTOR = '[data-e2e="computers-table-search"]';

async function run(reporter) {
    await runSuite('computers', async (browser, reporter) => {
        const page = await browser.newPage();
        await loginAsAdmin(page);

        await runTest(page, reporter, 'computers', 'list-computers', async () => {
            await navigateToAdmin(page, 'computers');
            await page.waitForSelector(TABLE_SELECTOR, {timeout: LDAP_TIMEOUT});
        });

        await runTest(page, reporter, 'computers', 'create-computer', async () => {
            await page.click('[data-e2e="computers-btn-new"]');
            await page.waitForSelector('[data-e2e="computers-create-input-name"]', {timeout: 5000});
            await page.fill('[data-e2e="computers-create-input-name"]', TEST_COMPUTER);
            await page.fill('[data-e2e="computers-create-input-description"]', 'E2E test computer');
            await page.click('[data-e2e="computers-create-btn-submit"]');
            // Wait for create to complete and modal to close, or reload
            await page.waitForTimeout(5000);
            // If modal still open, press Escape to close and reload
            const inputStillVisible = await page.$('[data-e2e="computers-create-input-name"]');
            if (inputStillVisible) {
                await page.keyboard.press('Escape');
                await page.waitForTimeout(500);
            }
            await page.goto(`${BASE_URL}/admin/computers`);
            await page.waitForSelector(TABLE_SELECTOR, {timeout: LDAP_TIMEOUT});
        });

        await runTest(page, reporter, 'computers', 'verify-created', async () => {
            await page.waitForSelector(`text=${TEST_COMPUTER}`, {timeout: LDAP_TIMEOUT});
        });

        await runTest(page, reporter, 'computers', 'view-details', async () => {
            const rows = await page.$$('tr');
            for (const row of rows) {
                const text = await row.evaluate(el => el.textContent);
                if (text.includes(TEST_COMPUTER)) {
                    const btn = await row.$('[data-e2e="computers-btn-details"]');
                    if (btn) await btn.click();
                    break;
                }
            }
            await page.waitForSelector('[data-e2e="computers-detail-btn-close"]', {timeout: 10000});
            await page.click('[data-e2e="computers-detail-btn-close"]');
            await page.waitForTimeout(500);
        });

        await runTest(page, reporter, 'computers', 'delete-computer', async () => {
            const rows = await page.$$('tr');
            for (const row of rows) {
                const text = await row.evaluate(el => el.textContent);
                if (text.includes(TEST_COMPUTER)) {
                    const btn = await row.$('[data-e2e="computers-btn-delete"]');
                    if (btn) await btn.click();
                    break;
                }
            }
            await confirmModal(page, 'computers-delete');
            await page.waitForTimeout(5000);
        });

        await page.close();
    }, reporter);
}

module.exports = {run};
