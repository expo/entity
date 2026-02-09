import { expect, it } from '@jest/globals';
import { readFile } from 'fs/promises';
import path from 'path';

it.each([
  'StubPostgresDatabaseAdapter',
  'StubPostgresDatabaseAdapterProvider',
  'createUnitTestPostgresEntityCompanionProvider',
])('%s is the same as in @expo/entity-database-adapter-knex', async (fileName) => {
  // These stub adapters need to be shared for testing, but we can't have them in the main
  // entity-database-adapter-knex package since they would be exposed in production.
  // Therefore, we duplicate them and ensure they stay in sync.

  const fileContentsFromEntityDatabaseAdapterKnex = await readFile(
    path.resolve(
      __dirname,
      `../../../entity-database-adapter-knex/src/__tests__/fixtures/${fileName}.ts`,
    ),
    'utf-8',
  );
  const fileContentsFromTestingUtils = await readFile(
    path.resolve(__dirname, `../${fileName}.ts`),
    'utf-8',
  );

  const trimmedFiles = [
    fileContentsFromEntityDatabaseAdapterKnex,
    fileContentsFromTestingUtils,
  ].map((file) => file.substring(file.indexOf('export')));

  expect(trimmedFiles[0]?.length).toBeGreaterThan(0);
  expect(trimmedFiles[0]).toEqual(trimmedFiles[1]);
});
