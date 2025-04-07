import { readFile } from 'fs/promises';
import path from 'path';

it.each([
  'createUnitTestEntityCompanionProvider',
  'describeFieldTestCase',
  'PrivacyPolicyRuleTestUtils',
  'StubCacheAdapter',
  'StubDatabaseAdapter',
  'StubDatabaseAdapterProvider',
  'StubQueryContextProvider',
  'TSMockitoExtensions',
])('$localPath the same as in @expo/entity', async (fileName) => {
  // There isn't a great way to have TSMockitoExtensions in a shared package since it circularly depends on entity itself,
  // and entity would want to use it for testing. Therefore, we duplicate it and ensure it stays in sync.

  const fileContentsFromEntity = await readFile(
    path.resolve(__dirname, `../../../entity/src/utils/__testfixtures__/${fileName}.ts`),
    'utf-8',
  );
  const fileContentsFromEntityTestingUtils = await readFile(
    path.resolve(__dirname, `../${fileName}.ts`),
    'utf-8',
  );

  const trimmedFiles = [fileContentsFromEntity, fileContentsFromEntityTestingUtils].map((file) =>
    file.substring(file.indexOf('export')),
  );

  expect(trimmedFiles[0]?.length).toBeGreaterThan(0);
  expect(trimmedFiles[0]).toEqual(trimmedFiles[1]);
});
