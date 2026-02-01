import { jest } from '@jest/globals';
import { readdirSync } from 'fs';
import { join } from 'path';

jest.autoMockOff();
const defineTest = require('jscodeshift/dist/testUtils').defineTest;

const fixtureDir = 'v0.55.0-v0.56.0';
const fixtureDirPath = join(__dirname, '..', '__testfixtures__', fixtureDir);
const fixtures = readdirSync(fixtureDirPath)
  .filter((file) => file.endsWith('.input.ts'))
  .map((file) => file.replace('.input.ts', ''));

for (const fixture of fixtures) {
  const prefix = `${fixtureDir}/${fixture}`;
  defineTest(__dirname, 'v0.55.0-v0.56.0', null, prefix, { parser: 'ts' });
}
