const {runSuite, runTest, loginAsAdmin, navigateToAdmin, confirmModal, BASE_URL, LDAP_TIMEOUT, LDAP_ACTION_TIMEOUT} = require('./helpers');

const TEST_GPO = 'E2E-Test-GPO';

async function run(reporter) {
    await runSuite('gpos', async (browser, reporter) => {
        const page = await browser.newPage();
        await loginAsAdmin(page);

        await runTest(page, reporter, 'gpos', 'list-gpos', async () => {
            await navigateToAdmin(page, 'gpos');
            await page.waitForSelector('[data-e2e="gpos-btn-new"]', {timeout: LDAP_TIMEOUT});
        });

        await runTest(page, reporter, 'gpos', 'create-gpo', async () => {
            await page.click('[data-e2e="gpos-btn-new"]');
            await page.waitForSelector('[data-e2e="gpos-create-input-name"]', {timeout: 5000});
            await page.fill('[data-e2e="gpos-create-input-name"]', TEST_GPO);
            await page.click('[data-e2e="gpos-create-btn-submit"]');
            // GPO creation via samba-tool can be very slow
            await page.waitForTimeout(10000);
            // If modal still open, close and reload
            const inputStillVisible = await page.$('[data-e2e="gpos-create-input-name"]');
            if (inputStillVisible) {
                const cancelBtn = await page.$('[data-e2e="gpos-create-btn-cancel"]');
                if (cancelBtn) await cancelBtn.click();
                await page.waitForTimeout(500);
            }
            await page.goto(`${BASE_URL}/admin/gpos`);
            await page.waitForSelector('[data-e2e="gpos-btn-new"]', {timeout: LDAP_TIMEOUT});
            await page.waitForTimeout(3000);
        });

        await runTest(page, reporter, 'gpos', 'verify-created', async () => {
            await page.waitForSelector(`text=${TEST_GPO}`, {timeout: LDAP_TIMEOUT});
        });

        await runTest(page, reporter, 'gpos', 'delete-gpo', async () => {
            const cards = await page.$$('[data-e2e="gpos-btn-delete"]');
            for (const btn of cards) {
                const parent = await btn.evaluateHandle(el => {
                    let p = el.parentElement;
                    while (p && !p.classList.contains('rounded-xl')) p = p.parentElement;
                    return p || el.parentElement;
                });
                const text = await parent.evaluate(el => el.textContent);
                if (text.includes(TEST_GPO)) {
                    await btn.click();
                    break;
                }
            }
            await confirmModal(page, 'gpos-delete');
            await page.waitForTimeout(5000);
        });

        await page.close();
    }, reporter);
}

module.exports = {run};
