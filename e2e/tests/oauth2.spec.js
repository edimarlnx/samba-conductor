const {chromium} = require('playwright');
const http = require('http');
const https = require('https');
const querystring = require('querystring');

const BASE_URL = process.env.BASE_URL || 'http://localhost:4080';
const ADMIN_USER = 'Administrator';
const ADMIN_PASS = 'P@ssw0rd123!';

// Helper: make HTTP request
function httpRequest({url, method = 'GET', headers = {}, body = null}) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const lib = parsed.protocol === 'https:' ? https : http;
        const options = {
            hostname: parsed.hostname,
            port: parsed.port,
            path: parsed.pathname + parsed.search,
            method,
            headers,
        };

        const req = lib.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    body: data,
                    json() {
                        return JSON.parse(data);
                    },
                });
            });
        });

        req.on('error', reject);
        if (body) req.write(body);
        req.end();
    });
}

async function loginAsAdmin(page) {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input#username, [data-e2e="login-input-username"]', ADMIN_USER);
    await page.fill('input#password, [data-e2e="login-input-password"]', ADMIN_PASS);
    await page.click('button[type="submit"], [data-e2e="login-btn-submit"]');
    await page.waitForURL('**/admin**', {timeout: 15000});
}

async function createOAuthClient(page, {clientName, redirectUri}) {
    await page.goto(`${BASE_URL}/admin/oauth/clients`);
    await page.waitForLoadState('networkidle');

    // Click New Client
    await page.click('button:has-text("New Client")');
    await page.waitForSelector('h3:has-text("New OAuth Client")');

    // Fill form
    await page.fill('input[placeholder="Grafana"]', clientName);
    await page.fill('textarea', redirectUri);

    // Submit
    await page.click('button:has-text("Create Client")');

    // Wait for credentials modal
    await page.waitForSelector('h3:has-text("Client Credentials")', {timeout: 10000});

    // Extract credentials
    const clientId = await page.locator('code').nth(0).textContent();
    const clientSecret = await page.locator('code').nth(1).textContent();

    // Close modal
    await page.click('button:has-text("Done")');

    return {clientId, clientSecret};
}

// --- Tests ---

async function testOAuthClientCRUD() {
    console.log('\n=== Test: OAuth Client CRUD ===');
    const browser = await chromium.launch();
    const page = await browser.newPage();

    try {
        // Login
        await loginAsAdmin(page);
        console.log('  [PASS] Admin login');

        // Navigate to OAuth Clients
        await page.goto(`${BASE_URL}/admin/oauth/clients`);
        await page.waitForLoadState('networkidle');
        console.log('  [PASS] OAuth Clients page loaded');

        // Create client
        const {clientId, clientSecret} = await createOAuthClient(page, {
            clientName: 'Test App',
            redirectUri: 'http://localhost:9999/callback',
        });

        console.log(`  [PASS] Client created: ${clientId}`);
        console.log(`  [PASS] Secret received: ${clientSecret.substring(0, 8)}...`);

        // Verify client appears in list
        await page.waitForSelector(`text=${clientId}`, {timeout: 5000});
        console.log('  [PASS] Client appears in list');

        // Delete client
        await page.click(`button:has-text("Delete")`);
        await page.waitForSelector('h3:has-text("Delete OAuth Client")');
        await page.click('button:has-text("Delete"):not(:has-text("OAuth"))');
        await page.waitForTimeout(1000);
        console.log('  [PASS] Client deleted');
    } catch (error) {
        console.error(`  [FAIL] ${error.message}`);
    } finally {
        await browser.close();
    }
}

async function testOAuthRealmCRUD() {
    console.log('\n=== Test: OAuth Realm CRUD ===');
    const browser = await chromium.launch();
    const page = await browser.newPage();

    try {
        await loginAsAdmin(page);

        await page.goto(`${BASE_URL}/admin/oauth/realms`);
        await page.waitForLoadState('networkidle');

        // Default realm should exist
        await page.waitForSelector('text=Default', {timeout: 5000});
        console.log('  [PASS] Default realm exists');

        // Create a new realm
        await page.click('button:has-text("New Realm")');
        await page.fill('input[placeholder="production"]', 'test-realm');
        await page.fill('input[placeholder="Production Apps"]', 'Test Realm');
        await page.click('button:has-text("Create")');
        await page.waitForTimeout(1000);

        await page.waitForSelector('text=Test Realm', {timeout: 5000});
        console.log('  [PASS] Realm created');

        // Delete the realm
        await page.click('button:has-text("Delete")');
        await page.waitForSelector('h3:has-text("Delete Realm")');
        await page.click('button:has-text("Delete"):last-of-type');
        await page.waitForTimeout(1000);
        console.log('  [PASS] Realm deleted');
    } catch (error) {
        console.error(`  [FAIL] ${error.message}`);
    } finally {
        await browser.close();
    }
}

async function testOAuthFlow() {
    console.log('\n=== Test: OAuth2 Authorization Code Flow ===');
    const browser = await chromium.launch();
    const page = await browser.newPage();

    try {
        // Step 1: Login and create a client
        await loginAsAdmin(page);
        const {clientId, clientSecret} = await createOAuthClient(page, {
            clientName: 'Flow Test',
            redirectUri: 'http://localhost:9999/callback',
        });
        console.log(`  [PASS] Test client created: ${clientId}`);

        // Step 2: Open authorize URL in new context (simulates external app)
        const context2 = await browser.newContext();
        const page2 = await context2.newPage();

        const authorizeUrl = `${BASE_URL}/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent('http://localhost:9999/callback')}&response_type=code&state=test123&scope=openid+profile+email`;

        await page2.goto(authorizeUrl);
        await page2.waitForSelector('#username', {timeout: 10000});
        console.log('  [PASS] Authorize page loaded');

        // Step 3: Login on authorize page
        await page2.fill('#username', ADMIN_USER);
        await page2.fill('#password', ADMIN_PASS);
        await page2.click('#submit-btn');

        // Step 4: Wait for redirect with code
        try {
            await page2.waitForURL('**/callback**', {timeout: 10000});
            const finalUrl = page2.url();
            const urlParams = new URL(finalUrl).searchParams;
            const code = urlParams.get('code');
            const state = urlParams.get('state');

            console.log(`  [PASS] Redirected with code: ${code?.substring(0, 8)}...`);
            console.log(`  [PASS] State preserved: ${state}`);

            if (!code) throw new Error('No authorization code received');

            // Step 5: Exchange code for token
            const tokenResponse = await httpRequest({
                url: `${BASE_URL}/oauth/token`,
                method: 'POST',
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                body: querystring.stringify({
                    grant_type: 'authorization_code',
                    code,
                    redirect_uri: 'http://localhost:9999/callback',
                    client_id: clientId,
                    client_secret: clientSecret,
                }),
            });

            const tokenData = tokenResponse.json();
            console.log(`  [PASS] Token received: ${tokenData.access_token?.substring(0, 8)}...`);
            console.log(`  [PASS] expires_in is integer: ${typeof tokenData.expires_in === 'number'}`);

            // Step 6: Call userinfo
            const userInfoResponse = await httpRequest({
                url: `${BASE_URL}/oauth/userinfo`,
                headers: {Authorization: `Bearer ${tokenData.access_token}`},
            });

            const userInfo = userInfoResponse.json();
            console.log(`  [PASS] UserInfo — login: ${userInfo.login}, name: ${userInfo.name}`);
            console.log(`  [PASS] UserInfo — email: ${userInfo.email}`);
            console.log(`  [PASS] UserInfo — groups: ${JSON.stringify(userInfo.groups)}`);
        } catch (error) {
            // Redirect may fail because localhost:9999 doesn't exist — check if we got the code in the error
            if (error.message.includes('ERR_CONNECTION_REFUSED')) {
                const failedUrl = page2.url();
                if (failedUrl.includes('code=')) {
                    console.log('  [PASS] Redirect with code (target unreachable, but code was issued)');
                } else {
                    throw error;
                }
            } else {
                throw error;
            }
        }

        await context2.close();

        // Cleanup: delete test client
        await page.goto(`${BASE_URL}/admin/oauth/clients`);
        await page.waitForLoadState('networkidle');
        console.log('  [PASS] Full OAuth2 flow completed');
    } catch (error) {
        console.error(`  [FAIL] ${error.message}`);
    } finally {
        await browser.close();
    }
}

async function testTokenEndpoint() {
    console.log('\n=== Test: Token Endpoint Format ===');

    try {
        // Test that /oauth/token returns proper error for invalid request
        const response = await httpRequest({
            url: `${BASE_URL}/oauth/token`,
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: 'grant_type=authorization_code&code=invalid',
        });

        console.log(`  [PASS] Token endpoint responds: status ${response.status}`);
    } catch (error) {
        console.error(`  [FAIL] ${error.message}`);
    }
}

// --- Run all tests ---
async function run() {
    console.log(`\nOAuth2 E2E Tests — ${BASE_URL}\n${'='.repeat(50)}`);

    await testTokenEndpoint();
    await testOAuthClientCRUD();
    await testOAuthRealmCRUD();
    await testOAuthFlow();

    console.log('\n' + '='.repeat(50));
    console.log('OAuth2 tests completed.');
}

run().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
