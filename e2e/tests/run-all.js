const {TestReporter} = require('./helpers');

const SUITES = {
    auth: () => require('./auth.spec'),
    dashboard: () => require('./dashboard.spec'),
    users: () => require('./users.spec'),
    groups: () => require('./groups.spec'),
    ous: () => require('./ous.spec'),
    computers: () => require('./computers.spec'),
    'service-accounts': () => require('./service-accounts.spec'),
    dns: () => require('./dns.spec'),
    gpos: () => require('./gpos.spec'),
    domain: () => require('./domain.spec'),
    'oauth-clients': () => require('./oauth-clients.spec'),
    'oauth-realms': () => require('./oauth-realms.spec'),
    settings: () => require('./settings.spec'),
    selfservice: () => require('./selfservice.spec'),
    dr: () => require('./dr.spec'),
};

async function main() {
    const filter = process.env.FILTER || '--all';
    const reporter = new TestReporter();

    console.log(`\nSamba Conductor E2E Tests\n${'='.repeat(50)}`);

    const suitesToRun = filter === '--all'
        ? Object.keys(SUITES)
        : Object.keys(SUITES).filter(name => name.includes(filter));

    if (suitesToRun.length === 0) {
        console.error(`No suites matching filter: ${filter}`);
        console.log(`Available suites: ${Object.keys(SUITES).join(', ')}`);
        process.exit(1);
    }

    console.log(`Running ${suitesToRun.length} suite(s): ${suitesToRun.join(', ')}\n`);

    for (const name of suitesToRun) {
        const suiteMod = SUITES[name]();
        if (typeof suiteMod.run === 'function') {
            await suiteMod.run(reporter);
        }
    }

    const reportPath = reporter.generateReport();
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Total: ${reporter.totalTests} | Passed: ${reporter.passedTests} | Failed: ${reporter.failedTests}`);
    console.log(`Report: ${reportPath}`);

    if (reporter.failedTests > 0) {
        process.exit(1);
    }
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
