
// Jest config
module.exports = {
  roots: ['<rootDir>/src'],
  testRegex: '(.*\\.test\\.(tsx?|jsx?))$',
  transform: {
    '^.+\\.ts$': 'ts-jest',
    '^.+\\.js$': 'babel-jest',
  },
  // preset: "jest-dynalite",
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
  globals: {
    "ts-jest": {
      isolatedModules: true,
      diagnostics: false,
    }
  }
}
