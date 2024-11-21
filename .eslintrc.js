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
        'no-void': ['warn', { allowAsStatement: true }],
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
    {
      files: ['**/__tests__/**/*.ts', '**/__tests__/**/*.tsx', '**/__tests__/**/*.d.ts'],
      parserOptions: {
        project: './tsconfig.json',
      },
      rules: {
        // ts-mockito verify function needs void functions within verify which is a void function
        '@typescript-eslint/no-confusing-void-expression': 'off',
      },
    },
  ],
};
