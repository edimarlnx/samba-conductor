const {runSuite, runTest, loginAsAdmin, navigateToAdmin, confirmModal, BASE_URL, LDAP_ACTION_TIMEOUT} = require('./helpers');

const TEST_CLIENT_NAME = 'E2E Test Client';

async function run(reporter) {
    await runSuite('oauth-clients', async (browser, reporter) => {
        const page = await browser.newPage();
        await loginAsAdmin(page);

        let clientId = null;

        await runTest(page, reporter, 'oauth-clients', 'list-clients', async () => {
            await navigateToAdmin(page, 'clients');
            await page.waitForSelector('[data-e2e="oauth-clients-btn-new"]', {timeout: 10000});
        });

        await runTest(page, reporter, 'oauth-clients', 'create-client', async () => {
            await page.click('[data-e2e="oauth-clients-btn-new"]');
            await page.waitForSelector('[data-e2e="oauth-client-form-input-name"]', {timeout: 5000});
            await page.fill('[data-e2e="oauth-client-form-input-name"]', TEST_CLIENT_NAME);
            await page.fill('[data-e2e="oauth-client-form-input-description"]', 'E2E test client');
            await page.fill('[data-e2e="oauth-client-form-input-redirect"]', 'http://localhost:9999/callback');
            await page.click('[data-e2e="oauth-client-form-btn-submit"]');
            await page.waitForSelector('h3:has-text("Client Credentials")', {timeout: LDAP_ACTION_TIMEOUT});
            const codes = await page.$$('code');
            if (codes.length >= 1) {
                clientId = await codes[0].textContent();
            }
            await page.click('[data-e2e="oauth-clients-btn-done"]');
            await page.waitForTimeout(1000);
        });

        await runTest(page, reporter, 'oauth-clients', 'verify-in-list', async () => {
            if (clientId) {
                await page.waitForSelector(`text=${clientId}`, {timeout: 10000});
            } else {
                await page.waitForSelector(`text=${TEST_CLIENT_NAME}`, {timeout: 10000});
            }
        });

        await runTest(page, reporter, 'oauth-clients', 'delete-client', async () => {
            await page.goto(`${BASE_URL}/admin/oauth/clients`);
            await page.waitForSelector('[data-e2e="oauth-clients-btn-new"]', {timeout: 10000});
            await page.waitForTimeout(2000);
            const deleteBtn = await page.$('[data-e2e="oauth-clients-btn-delete"]');
            if (!deleteBtn) throw new Error('Delete button not found');
            await deleteBtn.click();
            await confirmModal(page);
            await page.waitForTimeout(2000);
        });

        await page.close();
    }, reporter);
}

module.exports = {run};
