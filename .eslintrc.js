module.exports = {
  root: true,
  extends: ['universe/node', 'universe/shared/typescript-analysis'],
  plugins: ['eslint-plugin-tsdoc'],
  rules: {
    'no-restricted-imports': ['error', { paths: ['.', '..', '../..'] }],
    'tsdoc/syntax': 'warn',
    'no-console': 'warn',
    'handle-callback-err': 'off',
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx', '*.d.ts'],
      parserOptions: {
        project: './tsconfig.json',
      },
      rules: {
        '@typescript-eslint/explicit-function-return-type': [
          'warn',
          {
            allowExpressions: true,
          },
        ],
        '@typescript-eslint/naming-convention': [
          'warn',
          {
            selector: 'typeLike',
            format: ['PascalCase'],
          },
          {
            selector: 'enumMember',
            format: ['UPPER_CASE'],
          },
          // async functions must have names ending with 'Async'
          {
            selector: ['function', 'classMethod', 'typeMethod'],
            format: ['camelCase'],
            modifiers: ['async'],
            suffix: ['Async'],
          },
        ],
        'no-dupe-class-members': 'off',
        '@typescript-eslint/no-dupe-class-members': ['error'],
      },
    },
  ],
};
