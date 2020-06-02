module.exports = {
  preset: 'ts-jest',
  testMatch: ['**/__integration-tests__/**/*-test.ts'],
  coveragePathIgnorePatterns: ['testfixtures'],
  coverageDirectory: 'coverage-integration',
};
