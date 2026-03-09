import { readFile, readdir } from 'fs/promises';
import { defineInlineTest } from 'jscodeshift/src/testUtils.js';

async function readfixtureAsync(mod: string, name: string): Promise<string> {
  return await readFile(new URL(`../__testfixtures__/${mod}/${name}`, import.meta.url), {
    encoding: 'utf8',
  });
}

function prefixes(suffix: string): (names: string[]) => string[] {
  return (names) => names.filter((n) => n.endsWith(suffix)).map((n) => n.replace(suffix, ''));
}

const modules = await readdir(new URL('../', import.meta.url)).then(prefixes('.ts'));

for (const mod of modules) {
  const transform = await import(`../${mod}.ts`);
  const fixtureDir = new URL(`../__testfixtures__/${mod}`, import.meta.url);
  const fixtures = await readdir(fixtureDir).then(prefixes('.input.ts'));
  for (const fixture of fixtures) {
    defineInlineTest(
      transform,
      {},
      await readfixtureAsync(mod, `${fixture}.input.ts`),
      await readfixtureAsync(mod, `${fixture}.output.ts`),
    );
  }
}
