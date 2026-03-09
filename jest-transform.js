import { stripTypeScriptTypes } from 'node:module';

export function process(sourceText, sourcePath) {
  return {
    code: stripTypeScriptTypes(sourceText, {
      mode: 'transform',
      sourceMap: true,
      sourceUrl: sourcePath,
    }),
  };
}
