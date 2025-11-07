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
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './test-results',
      outputName: 'junit.xml',
    }]
  ],
  coverageDirectory: './coverage',
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.test.ts'],
};

