const {runSuite, runTest, loginAsAdmin, navigateToAdmin, confirmModal, BASE_URL, LDAP_TIMEOUT, LDAP_ACTION_TIMEOUT} = require('./helpers');

const TEST_USER = 'e2eTestUser';
const TEST_PASS = 'T3st!Pass@2024';

// DataTable renders data-e2e as "${prefix}-search" on the search input
const TABLE_SELECTOR = '[data-e2e="users-table-search"]';

async function run(reporter) {
    await runSuite('users', async (browser, reporter) => {
        const page = await browser.newPage();
        await loginAsAdmin(page);

        await runTest(page, reporter, 'users', 'list-users', async () => {
            await navigateToAdmin(page, 'users');
            await page.waitForSelector(TABLE_SELECTOR, {timeout: LDAP_TIMEOUT});
        });

        await runTest(page, reporter, 'users', 'create-user', async () => {
            await page.click('[data-e2e="users-btn-new"]');
            await page.waitForSelector('[data-e2e="user-form-input-username"]', {timeout: 10000});
            await page.fill('[data-e2e="user-form-input-username"]', TEST_USER);
            await page.fill('[data-e2e="user-form-input-password"]', TEST_PASS);
            await page.fill('[data-e2e="user-form-input-first-name"]', 'E2E');
            await page.fill('[data-e2e="user-form-input-last-name"]', 'TestUser');
            await page.fill('[data-e2e="user-form-input-email"]', 'e2e@test.local');
            await page.fill('[data-e2e="user-form-input-description"]', 'Created by E2E tests');
            await page.click('[data-e2e="user-form-btn-submit"]');
            // Wait for URL to change from /new to /admin/users (list)
            await page.waitForFunction(
                () => !window.location.pathname.includes('/new'),
                {timeout: LDAP_ACTION_TIMEOUT}
            );
            await page.waitForSelector(TABLE_SELECTOR, {timeout: LDAP_TIMEOUT});
        });

        await runTest(page, reporter, 'users', 'verify-created', async () => {
            await page.waitForSelector(`text=${TEST_USER}`, {timeout: LDAP_TIMEOUT});
        });

        await runTest(page, reporter, 'users', 'edit-user', async () => {
            await page.goto(`${BASE_URL}/admin/users/${TEST_USER}/edit`);
            await page.waitForSelector('[data-e2e="user-form-input-first-name"]', {timeout: LDAP_TIMEOUT});
            await page.fill('[data-e2e="user-form-input-description"]', 'Updated by E2E');
            await page.fill('[data-e2e="user-form-input-company"]', 'E2E Corp');
            await page.click('[data-e2e="user-form-btn-submit"]');
            await page.waitForURL('**/admin/users', {timeout: LDAP_ACTION_TIMEOUT});
        });

        await runTest(page, reporter, 'users', 'toggle-disable', async () => {
            await page.goto(`${BASE_URL}/admin/users`);
            await page.waitForSelector(TABLE_SELECTOR, {timeout: LDAP_TIMEOUT});
            await page.waitForSelector(`text=${TEST_USER}`, {timeout: LDAP_TIMEOUT});
            const rows = await page.$$('tr');
            for (const row of rows) {
                const text = await row.evaluate(el => el.textContent);
                if (text.includes(TEST_USER)) {
                    const toggleBtn = await row.$('[data-e2e="users-btn-toggle-status"]');
                    if (toggleBtn) {
                        await toggleBtn.click();
                        // Toggle opens a ConfirmModal
                        await confirmModal(page);
                        await page.waitForTimeout(5000);
                    }
                    break;
                }
            }
        });

        await runTest(page, reporter, 'users', 'toggle-enable', async () => {
            // Reload to clear any lingering overlays
            await page.goto(`${BASE_URL}/admin/users`);
            await page.waitForSelector(TABLE_SELECTOR, {timeout: LDAP_TIMEOUT});
            await page.waitForSelector(`text=${TEST_USER}`, {timeout: LDAP_TIMEOUT});
            const rows = await page.$$('tr');
            for (const row of rows) {
                const text = await row.evaluate(el => el.textContent);
                if (text.includes(TEST_USER)) {
                    const toggleBtn = await row.$('[data-e2e="users-btn-toggle-status"]');
                    if (toggleBtn) {
                        await toggleBtn.click();
                        await confirmModal(page);
                        await page.waitForTimeout(5000);
                    }
                    break;
                }
            }
        });

        await runTest(page, reporter, 'users', 'delete-user', async () => {
            await page.goto(`${BASE_URL}/admin/users`);
            await page.waitForSelector(TABLE_SELECTOR, {timeout: LDAP_TIMEOUT});
            await page.waitForSelector(`text=${TEST_USER}`, {timeout: LDAP_TIMEOUT});
            const rows = await page.$$('tr');
            for (const row of rows) {
                const text = await row.evaluate(el => el.textContent);
                if (text.includes(TEST_USER)) {
                    const deleteBtn = await row.$('[data-e2e="users-btn-delete"]');
                    if (deleteBtn) {
                        await deleteBtn.click();
                        break;
                    }
                }
            }
            await confirmModal(page, 'users-delete');
            await page.waitForTimeout(5000);
        });

        await page.close();
    }, reporter);
}

module.exports = {run};
