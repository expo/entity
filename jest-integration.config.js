import unitConfig from './jest.config.js';

export default {
  ...unitConfig,
  coverageDirectory: 'coverage-integration',
  testMatch: ['**/__integration-tests__/**/*-test.ts'],
};
