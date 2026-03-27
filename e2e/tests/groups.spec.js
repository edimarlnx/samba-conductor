const {runSuite, runTest, loginAsAdmin, navigateToAdmin, confirmModal, BASE_URL, LDAP_TIMEOUT, LDAP_ACTION_TIMEOUT} = require('./helpers');

const TEST_GROUP = 'E2E-Test-Group';
const TABLE_SELECTOR = '[data-e2e="groups-table-search"]';

async function run(reporter) {
    await runSuite('groups', async (browser, reporter) => {
        const page = await browser.newPage();
        await loginAsAdmin(page);

        await runTest(page, reporter, 'groups', 'list-groups', async () => {
            await navigateToAdmin(page, 'groups');
            await page.waitForSelector(TABLE_SELECTOR, {timeout: LDAP_TIMEOUT});
        });

        await runTest(page, reporter, 'groups', 'create-group', async () => {
            await page.click('[data-e2e="groups-btn-new"]');
            await page.waitForSelector('[data-e2e="group-form-input-name"]', {timeout: 10000});
            await page.fill('[data-e2e="group-form-input-name"]', TEST_GROUP);
            await page.fill('[data-e2e="group-form-input-description"]', 'Created by E2E tests');
            await page.click('[data-e2e="group-form-btn-submit"]');
            await page.waitForURL('**/admin/groups', {timeout: LDAP_ACTION_TIMEOUT});
            await page.waitForSelector(TABLE_SELECTOR, {timeout: LDAP_TIMEOUT});
        });

        await runTest(page, reporter, 'groups', 'verify-created', async () => {
            await page.waitForSelector(`text=${TEST_GROUP}`, {timeout: LDAP_TIMEOUT});
        });

        await runTest(page, reporter, 'groups', 'view-edit-page', async () => {
            await page.goto(`${BASE_URL}/admin/groups/${TEST_GROUP}/edit`);
            // Edit page shows group info and members section (no submit button in edit mode)
            await page.waitForSelector(`text=${TEST_GROUP}`, {timeout: LDAP_TIMEOUT});
        });

        await runTest(page, reporter, 'groups', 'delete-group', async () => {
            await page.goto(`${BASE_URL}/admin/groups`);
            await page.waitForSelector(TABLE_SELECTOR, {timeout: LDAP_TIMEOUT});
            await page.waitForSelector(`text=${TEST_GROUP}`, {timeout: LDAP_TIMEOUT});
            const rows = await page.$$('tr');
            for (const row of rows) {
                const text = await row.evaluate(el => el.textContent);
                if (text.includes(TEST_GROUP)) {
                    const deleteBtn = await row.$('[data-e2e="groups-btn-delete"]');
                    if (deleteBtn) {
                        await deleteBtn.click();
                        break;
                    }
                }
            }
            await confirmModal(page, 'groups-delete');
            await page.waitForTimeout(5000);
        });

        await page.close();
    }, reporter);
}

module.exports = {run};
