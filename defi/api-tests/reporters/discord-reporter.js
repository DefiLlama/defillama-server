// discord-reporter.js
const axios = require('axios');
const sdk = require('@defillama/sdk');

class DiscordReporter {
  constructor(globalConfig, options) {
    this._globalConfig = globalConfig;
    this._options = options;
    this.webhookUrl = process.env.DIM_ERROR_CHANNEL_WEBHOOK
  }

  async onRunComplete(contexts, results) {
    if (!this.webhookUrl) {
      console.warn('No Discord webhook URL provided');
      return;
    }

    const { numFailedTests, numPassedTests, numTotalTests, testResults } = results;

    console.log(`Total Tests: ${numTotalTests}, Passed: ${numPassedTests}, Failed: ${numFailedTests}`);


    for (const testResult of testResults) {
      const file = testResult.testFilePath.split('/src').pop();
      await sdk.elastic.writeLog('defi-api-test-file', {
        file,
        passed: testResult.numPassingTests,
        failed: testResult.numFailingTests,
        timestamp: new Date().toISOString(),
        perfStats: testResult.perfStats,
      })
    }

    await sdk.elastic.writeLog('defi-api-test-all', {
      totalTests: numTotalTests,
      passedTests: numPassedTests,
      failedTests: numFailedTests,
      timestamp: new Date().toISOString(),
    })

    if (numFailedTests === 0) {
      // Optional: send success message
      // await this.sendSuccessMessage(numPassedTests, numTotalTests);
      return;
    }

    const failedTests = this.aggregateFailures(testResults);
    await this.sendFailureMessage(failedTests, numFailedTests, numTotalTests);
  }

  aggregateFailures(testResults) {
    const failures = [];

    testResults.forEach(result => {
      if (result.numFailingTests > 0) {
        result.testResults.forEach(test => {
          if (test.status === 'failed') {
            failures.push({
              file: result.testFilePath.split('/').pop(),
              testName: test.fullName,
              error: test.failureMessages[0]?.split('\n')[0] || 'Unknown error',
              duration: test.duration
            });
          }
        });
      }
    });

    return failures;
  }

  async sendFailureMessage(failures, numFailed, numTotal) {
    console.log(failures)
    const embed = {
      title: '❌ Jest Tests Failed',
      color: 0xff0000, // Red
      fields: [
        {
          name: 'Summary',
          value: `${numFailed}/${numTotal} tests failed`,
          inline: true
        },
        {
          name: 'Failed Tests',
          value: failures.slice(0, 10).map(f =>
            `• **${f.file}**: ${f.testName.substring(0, 80)}${f.testName.length > 80 ? '...' : ''}`
          ).join('\n') + (failures.length > 10 ? `\n... and ${failures.length - 10} more` : ''),
          inline: false
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: `Build: ${process.env.BUILD_NUMBER || 'local'}`
      }
    };

    if (failures.length > 0 && false) {
      // Remove ANSI escape codes and clean up the error message
      const cleanError = failures[0].error
        .replace(/\x1B\[31m/g, '**') // Convert ANSI red to Discord bold
        .replace(/\x1B\[32m/g, '**') // Convert ANSI green to Discord bold
        .replace(/\x1B\[33m/g, '*') // Convert ANSI yellow to Discord italic
        .replace(/\x1B\[39m/g, '**') // Convert ANSI default color reset to Discord bold end
        .replace(/\x1B\[22m/g, '**') // Convert ANSI reset to Discord bold end
        .replace(/\x1B\[2m/g, '*')   // Convert ANSI dim to Discord italic
        .replace(/\x1B\[\d+m/g, '')  // Remove any remaining ANSI codes
        .substring(0, 500);

      embed.fields.push({
        name: 'First Error',
        value: `\`\`\`\n${cleanError}\n\`\`\``,
        inline: false
      });
    }

    await this.sendToDiscord({ embeds: [embed] });
  }

  async sendSuccessMessage(numPassed, numTotal) {
    const embed = {
      title: '✅ All Jest Tests Passed',
      color: 0x00ff00, // Green
      fields: [
        {
          name: 'Summary',
          value: `${numPassed}/${numTotal} tests passed`,
          inline: true
        }
      ],
      timestamp: new Date().toISOString()
    };

    await this.sendToDiscord({ embeds: [embed] });
  }

  async sendToDiscord(payload) {
    if (!this.webhookUrl) {
      return;
    }
    try {
      await axios.post(this.webhookUrl, payload, {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Failed to send Discord notification:', error.message);
    }
  }
}

module.exports = DiscordReporter;