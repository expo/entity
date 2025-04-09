import { readFile } from 'fs/promises';
import path from 'path';

it.each([
  {
    localPath: 'src/createUnitTestEntityCompanionProvider.ts',
    entityPath: 'src/utils/__testfixtures__/createUnitTestEntityCompanionProvider.ts',
  },
  {
    localPath: 'src/describeFieldTestCase.ts',
    entityPath: 'src/utils/__testfixtures__/describeFieldTestCase.ts',
  },
  {
    localPath: 'src/PrivacyPolicyRuleTestUtils.ts',
    entityPath: 'src/utils/__testfixtures__/PrivacyPolicyRuleTestUtils.ts',
  },
  {
    localPath: 'src/StubCacheAdapter.ts',
    entityPath: 'src/utils/__testfixtures__/StubCacheAdapter.ts',
  },
  {
    localPath: 'src/StubDatabaseAdapter.ts',
    entityPath: 'src/utils/__testfixtures__/StubDatabaseAdapter.ts',
  },
  {
    localPath: 'src/StubDatabaseAdapterProvider.ts',
    entityPath: 'src/utils/__testfixtures__/StubDatabaseAdapterProvider.ts',
  },
  {
    localPath: 'src/StubQueryContextProvider.ts',
    entityPath: 'src/utils/__testfixtures__/StubQueryContextProvider.ts',
  },
  {
    localPath: 'src/TSMockitoExtensions.ts',
    entityPath: 'src/internal/__tests__/TSMockitoExtensions.ts',
  },
])('$localPath the same as in @expo/entity', async ({ localPath, entityPath }) => {
  // There isn't a great way to have TSMockitoExtensions in a shared package since it circularly depends on entity itself,
  // and entity would want to use it for testing. Therefore, we duplicate it and ensure it stays in sync.

  const fileContentsFromEntity = await readFile(
    path.resolve(__dirname, `../../../entity/${entityPath}`),
    'utf-8',
  );
  const fileContentsFromEntityTestingUtils = await readFile(
    path.resolve(__dirname, `../../${localPath}`),
    'utf-8',
  );

  const trimmedFiles = [fileContentsFromEntity, fileContentsFromEntityTestingUtils].map((file) =>
    file.substring(file.indexOf('export')),
  );

  expect(trimmedFiles[0]?.length).toBeGreaterThan(0);
  expect(trimmedFiles[0]).toEqual(trimmedFiles[1]);
});
