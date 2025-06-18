const unitConfig = require('./jest.config.js');

module.exports = {
  ...unitConfig,
  coverageDirectory: 'coverage-integration',
  testMatch: ['**/__integration-tests__/**/*-test.ts'],
};
