module.exports = {
  coveragePathIgnorePatterns: ['__testfixtures__'],
  testMatch: ['**/__tests__/**/*-test.ts'],
  transform: {
    '\\.[jt]sx?$': ['babel-jest', { rootMode: 'upward' }],
  },
};
