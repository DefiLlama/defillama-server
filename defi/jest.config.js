
module.exports = {
  roots: ['<rootDir>/src', '<rootDir>/api-tests/src'],
  testRegex: '(.*\\.test\\.(tsx?|jsx?))$',
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        isolatedModules: true,
      },
      diagnostics: false,
    }],
    '^.+\\.js$': 'babel-jest',
  },
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  transformIgnorePatterns: [
    '/node_modules/(?!@polkadot|@babel/runtime/helpers/esm/)'
  ],
  testPathIgnorePatterns: ["src/adaptorsImprov", "src/adaptors"],
  detectOpenHandles: true,
  forceExit: true,
  maxWorkers: 1,
  ci: false,
  cacheDirectory: '/tmp/jest-cache',
  testEnvironment: "node",
}
