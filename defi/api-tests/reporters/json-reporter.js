// discord-reporter.js
const fs = require('fs/promises')

class JSONReporter {
  constructor(globalConfig, options) {
    this._globalConfig = globalConfig;
    this._options = options
    if (!options.outputDirectory) options.outputDirectory = __dirname
    if (!options.outputName) options.outputName = 'junit.json'
  }

  async onRunComplete(contexts, results) {
    const outputFile = `${this._options.outputDirectory || '.'}/${this._options.outputName}`;
    console.log(`Writing JSON test report to ${outputFile}`);

    await fs.writeFile(outputFile, JSON.stringify(results));
  }
}

module.exports = JSONReporter;