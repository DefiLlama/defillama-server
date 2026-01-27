// json-reporter.js
const fs = require('fs/promises')
const path = require('path')

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

    // Ensure the output directory exists
    const outputDir = path.dirname(outputFile);
    await fs.mkdir(outputDir, { recursive: true });

    await fs.writeFile(outputFile, JSON.stringify(results));
  }
}

module.exports = JSONReporter;