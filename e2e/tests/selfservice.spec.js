const {runSuite, runTest, loginAsAdmin, waitForPageReady, BASE_URL} = require('./helpers');

async function run(reporter) {
    await runSuite('selfservice', async (browser, reporter) => {
        const page = await browser.newPage();

        // Login as admin but navigate to self-service
        await page.goto(`${BASE_URL}/login`);
        await page.waitForSelector('[data-e2e="login-input-username"]', {timeout: 15000});
        await page.fill('[data-e2e="login-input-username"]', 'Administrator');
        await page.fill('[data-e2e="login-input-password"]', 'P@ssw0rd123!');
        await page.click('[data-e2e="login-btn-submit"]');
        await page.waitForURL('**/admin**', {timeout: 15000});

        await runTest(page, reporter, 'selfservice', 'home-page', async () => {
            await page.goto(`${BASE_URL}/`);
            await page.waitForSelector('[data-e2e="selfservice-home-link-edit-profile"]', {timeout: 10000});
        });

        await runTest(page, reporter, 'selfservice', 'home-links', async () => {
            const editLink = await page.$('[data-e2e="selfservice-home-link-edit-profile"]');
            const passLink = await page.$('[data-e2e="selfservice-home-link-change-password"]');
            if (!editLink) throw new Error('Edit profile link not found');
            if (!passLink) throw new Error('Change password link not found');
        });

        await runTest(page, reporter, 'selfservice', 'profile-page', async () => {
            await page.click('[data-e2e="selfservice-home-link-edit-profile"]');
            await page.waitForURL('**/profile**', {timeout: 10000});
            await page.waitForSelector('[data-e2e="profile-btn-save"]', {timeout: 10000});
        });

        await runTest(page, reporter, 'selfservice', 'profile-cancel', async () => {
            await page.click('[data-e2e="profile-btn-cancel"]');
            await page.waitForURL(`${BASE_URL}/`, {timeout: 10000});
        });

        await runTest(page, reporter, 'selfservice', 'change-password-page', async () => {
            await page.click('[data-e2e="selfservice-home-link-change-password"]');
            await page.waitForURL('**/change-password**', {timeout: 10000});
            await page.waitForSelector('[data-e2e="change-password-input-current"]', {timeout: 10000});
            await page.waitForSelector('[data-e2e="change-password-input-new"]', {timeout: 5000});
            await page.waitForSelector('[data-e2e="change-password-input-confirm"]', {timeout: 5000});
        });

        await runTest(page, reporter, 'selfservice', 'change-password-cancel', async () => {
            await page.click('[data-e2e="change-password-btn-cancel"]');
            await page.waitForURL(`${BASE_URL}/`, {timeout: 10000});
        });

        await page.close();
    }, reporter);
}

module.exports = {run};
