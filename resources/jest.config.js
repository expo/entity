module.exports = {
  preset: 'ts-jest',
  testMatch: ['**/__tests__/**/*-test.ts'],
  coveragePathIgnorePatterns: ['__testfixtures__'],
  globals: {
    'ts-jest': {
      diagnostics: {
        warnOnly: true,
      },
    },
  },
};
