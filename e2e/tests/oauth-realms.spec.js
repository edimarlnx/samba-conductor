const {runSuite, runTest, loginAsAdmin, navigateToAdmin, waitForPageReady, confirmModal} = require('./helpers');

const TEST_REALM_NAME = 'e2e-test-realm';
const TEST_REALM_DISPLAY = 'E2E Test Realm';

async function run(reporter) {
    await runSuite('oauth-realms', async (browser, reporter) => {
        const page = await browser.newPage();
        await loginAsAdmin(page);

        await runTest(page, reporter, 'oauth-realms', 'list-realms', async () => {
            await navigateToAdmin(page, 'realms');
            await page.waitForSelector('[data-e2e="oauth-realms-btn-new"]', {timeout: 10000});
        });

        await runTest(page, reporter, 'oauth-realms', 'default-exists', async () => {
            await page.waitForSelector('text=Default', {timeout: 5000});
        });

        await runTest(page, reporter, 'oauth-realms', 'create-realm', async () => {
            await page.click('[data-e2e="oauth-realms-btn-new"]');
            await page.waitForSelector('[data-e2e="oauth-realm-form-input-name"]', {timeout: 5000});
            await page.fill('[data-e2e="oauth-realm-form-input-name"]', TEST_REALM_NAME);
            await page.fill('[data-e2e="oauth-realm-form-input-display-name"]', TEST_REALM_DISPLAY);
            await page.click('[data-e2e="oauth-realm-form-btn-submit"]');
            await page.waitForTimeout(2000);
            await page.waitForSelector(`text=${TEST_REALM_DISPLAY}`, {timeout: 10000});
        });

        await runTest(page, reporter, 'oauth-realms', 'delete-realm', async () => {
            // Find the test realm card and click delete
            const deleteButtons = await page.$$('[data-e2e="oauth-realms-btn-delete"]');
            for (const btn of deleteButtons) {
                const card = await btn.evaluateHandle(el => el.closest('[data-e2e="oauth-realms-card"]'));
                if (card) {
                    const text = await card.evaluate(el => el.textContent);
                    if (text.includes(TEST_REALM_DISPLAY)) {
                        await btn.click();
                        break;
                    }
                }
            }
            await confirmModal(page);
            await page.waitForTimeout(2000);
        });

        await page.close();
    }, reporter);
}

module.exports = {run};
