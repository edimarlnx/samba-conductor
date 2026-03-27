const {runSuite, runTest, loginAsAdmin, navigateToAdmin, confirmModal, BASE_URL, LDAP_TIMEOUT, LDAP_ACTION_TIMEOUT} = require('./helpers');

const TEST_OU = 'E2E-Test-OU';

async function run(reporter) {
    await runSuite('ous', async (browser, reporter) => {
        const page = await browser.newPage();
        await loginAsAdmin(page);

        await runTest(page, reporter, 'ous', 'view-tree', async () => {
            await navigateToAdmin(page, 'ous');
            await page.waitForSelector('[data-e2e="ous-tree-item"]', {timeout: LDAP_TIMEOUT});
        });

        await runTest(page, reporter, 'ous', 'create-ou', async () => {
            await page.click('[data-e2e="ous-btn-new"]');
            await page.waitForSelector('[data-e2e="ous-create-input-name"]', {timeout: 5000});
            await page.fill('[data-e2e="ous-create-input-name"]', TEST_OU);
            await page.fill('[data-e2e="ous-create-input-description"]', 'E2E test OU');
            await page.click('[data-e2e="ous-create-btn-submit"]');
            // Wait for modal to close (LDAP OU creation)
            await page.waitForTimeout(10000);
            // If modal still open, close it (operation may still be in progress)
            const inputStillVisible = await page.$('[data-e2e="ous-create-input-name"]');
            if (inputStillVisible) {
                // Try clicking Cancel to close modal
                const cancelBtn = await page.$('[data-e2e="ous-create-btn-cancel"]');
                if (cancelBtn) await cancelBtn.click();
                await page.waitForTimeout(500);
            }
            // Reload to see if OU was created
            await page.goto(`${BASE_URL}/admin/ous`);
            await page.waitForSelector('[data-e2e="ous-tree-item"]', {timeout: LDAP_TIMEOUT});
            await page.waitForTimeout(2000);
        });

        await runTest(page, reporter, 'ous', 'select-ou', async () => {
            const treeItems = await page.$$('[data-e2e="ous-tree-item"]');
            let found = false;
            for (const item of treeItems) {
                const text = await item.evaluate(el => el.textContent);
                if (text.includes(TEST_OU)) {
                    await item.click();
                    found = true;
                    break;
                }
            }
            if (!found) throw new Error(`OU ${TEST_OU} not found in tree`);
        });

        await runTest(page, reporter, 'ous', 'delete-ou', async () => {
            await page.click('[data-e2e="ous-btn-delete"]');
            await confirmModal(page, 'ous-delete');
            await page.waitForTimeout(5000);
        });

        await page.close();
    }, reporter);
}

module.exports = {run};
