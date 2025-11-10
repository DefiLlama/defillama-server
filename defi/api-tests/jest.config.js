module.exports = {
  roots: ['<rootDir>/src'],
  testRegex: '(.*\\.test\\.(tsx?|jsx?))$',
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        isolatedModules: true,
      },
      diagnostics: false,
    }],
  },
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  testEnvironment: 'node',
  testTimeout: 30000,
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  maxWorkers: 1,
  randomize: true,
  reporters: [
    "default", "jest-junit",
    ['./reporters/discord-reporter.js', {
      outputDirectory: './test-results',
      outputName: 'junit-discord.xml',
    }],
    ['./reporters/json-reporter.js', {
      outputDirectory: './test-results',
      outputName: 'junit.json',
    }]
  ],
  coverageDirectory: './coverage',
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.test.ts'],
};

