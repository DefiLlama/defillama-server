// Jest config
module.exports = {
  roots: ['<rootDir>/src'],
  testRegex: '(.*\\.test\\.(tsx?|jsx?))$',
  transform: {
    '^.+\\.ts$': 'ts-jest',
    '^.+\\.js$': 'babel-jest',
  },
  preset: "jest-dynalite",
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
};
