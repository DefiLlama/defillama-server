const fetch = require('node-fetch');

class DataTestDiscordReporter {
  constructor(globalConfig, options) {
    this._globalConfig = globalConfig;
    this._options = options;
    this.webhookUrl = process.env.JTEST_WEBHOOK;
  }

  async onRunComplete(_contexts, results) {
    if (!this.webhookUrl) {
      console.warn('JTEST_WEBHOOK not set, skipping Discord notification');
      return;
    }

    const { numFailedTests, numPassedTests, numTotalTests, testResults } = results;
    console.log(`data.ts tests — Total: ${numTotalTests}, Passed: ${numPassedTests}, Failed: ${numFailedTests}`);

    if (numFailedTests === 0) return;

    const failures = [];
    for (const result of testResults) {
      for (const test of result.testResults) {
        if (test.status === 'failed') {
          failures.push({
            testName: test.fullName,
            error: (test.failureMessages[0] || 'Unknown error')
              .replace(/\x1B\[\d+m/g, '')
              .split('\n')[0]
              .substring(0, 200),
          });
        }
      }
    }

    let failedTestsValue = failures.slice(0, 10).map(f =>
      `- **${f.testName}**\n  ${f.error}`
    ).join('\n') + (failures.length > 10 ? `\n... and ${failures.length - 10} more` : '');

    if (!failedTestsValue) failedTestsValue = 'No individual test details available (suite-level error)';
    if (failedTestsValue.length > 1024) failedTestsValue = failedTestsValue.substring(0, 1021) + '...';

    const embed = {
      title: 'data.ts tests failed',
      color: 0xff0000,
      fields: [
        {
          name: 'Summary',
          value: `${numFailedTests}/${numTotalTests} tests failed`,
          inline: true,
        },
        {
          name: 'Failed Tests',
          value: failedTestsValue,
          inline: false,
        },
      ],
      timestamp: new Date().toISOString(),
    };

    try {
      await fetch(`${this.webhookUrl}?wait=true`, {
        method: 'post',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [embed] }),
      });
    } catch (error) {
      console.error('Failed to send Discord notification:', error.message);
    }
  }
}

module.exports = DataTestDiscordReporter;
