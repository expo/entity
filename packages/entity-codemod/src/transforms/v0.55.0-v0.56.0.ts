import { API, Collection, FileInfo, Options } from 'jscodeshift';

const KNEX_SPECIFIC_METHODS = [
  'loadFirstByFieldEqualityConjunctionAsync',
  'loadManyByFieldEqualityConjunctionAsync',
  'loadManyByRawWhereClauseAsync',
];

function isKnexSpecificMethodUsed(j: API['jscodeshift'], node: any): boolean {
  // Check if this loader call is followed by a knex-specific method
  // We need to traverse the AST to find usages of the loader result
  const parent = node.parent;

  // Check if the loader call is directly chained with a knex method
  if (parent?.value.type === 'MemberExpression' && parent.value.object === node.value) {
    const grandParent = parent.parent;
    if (grandParent?.value.type === 'CallExpression' && grandParent.value.callee === parent.value) {
      if (
        parent.value.property.type === 'Identifier' &&
        KNEX_SPECIFIC_METHODS.includes(parent.value.property.name)
      ) {
        return true;
      }
    }
  }

  // Check if the loader is assigned to a variable and then used with knex methods
  if (parent?.value.type === 'VariableDeclarator' && parent.value.init === node.value) {
    const variableName = parent.value.id.name;
    const scope = parent.scope;

    // Find all references to this variable in the same scope
    const references = j(scope.path)
      .find(j.Identifier, { name: variableName })
      .filter((path) => {
        // Check if this identifier is used as object in member expression
        const parentNode = path.parent.value;
        if (parentNode.type === 'MemberExpression' && parentNode.object === path.value) {
          const prop = parentNode.property;
          if (prop.type === 'Identifier' && KNEX_SPECIFIC_METHODS.includes(prop.name)) {
            return true;
          }
        }
        return false;
      });

    if (references.size() > 0) {
      return true;
    }
  }

  // Check await expressions
  if (parent?.value.type === 'AwaitExpression' && parent.value.argument === node.value) {
    const awaitParent = parent.parent;
    if (awaitParent?.value.type === 'VariableDeclarator') {
      const variableName = awaitParent.value.id.name;
      const scope = awaitParent.scope;

      // Find all references to this variable in the same scope
      const references = j(scope.path)
        .find(j.Identifier, { name: variableName })
        .filter((path) => {
          const parentNode = path.parent.value;
          if (parentNode.type === 'MemberExpression' && parentNode.object === path.value) {
            const prop = parentNode.property;
            if (prop.type === 'Identifier' && KNEX_SPECIFIC_METHODS.includes(prop.name)) {
              return true;
            }
          }
          return false;
        });

      if (references.size() > 0) {
        return true;
      }
    }
  }

  return false;
}

function transformLoaderToKnexLoader(j: API['jscodeshift'], root: Collection<any>): boolean {
  let transformed = false;

  // Find all entity expressions of the form `Entity.loader(viewerContext)`
  root
    .find(j.CallExpression, {
      callee: {
        type: 'MemberExpression',
        property: {
          name: 'loader',
        },
      },
    })
    .forEach((path) => {
      const loaderCallExpression = path.node; // Entity.loader(viewerContext)
      const loaderCallee = loaderCallExpression.callee; // Entity.loader

      if (loaderCallee.type !== 'MemberExpression') {
        return;
      }

      // Make sure this is a static method call on an entity (not on an instance)
      // Typically entity names start with uppercase letter
      if (loaderCallee.object.type === 'Identifier') {
        const firstChar = loaderCallee.object.name[0];
        if (firstChar === firstChar?.toUpperCase()) {
          // Check if this loader uses knex-specific methods
          if (isKnexSpecificMethodUsed(j, path)) {
            // Transform Entity.loader(viewerContext) → knexLoader(Entity, viewerContext)
            const entityIdentifier = loaderCallee.object;
            const args = loaderCallExpression.arguments;

            j(path).replaceWith(
              j.callExpression(j.identifier('knexLoader'), [entityIdentifier, ...args]),
            );
            transformed = true;
          }
        }
      }
    });

  return transformed;
}

function transformLoaderWithAuthorizationResultsToKnexLoaderWithAuthorizationResults(
  j: API['jscodeshift'],
  root: Collection<any>,
): boolean {
  let transformed = false;

  // Find all entity expressions of the form `Entity.loaderWithAuthorizationResults(viewerContext)`
  root
    .find(j.CallExpression, {
      callee: {
        type: 'MemberExpression',
        property: {
          name: 'loaderWithAuthorizationResults',
        },
      },
    })
    .forEach((path) => {
      const loaderCallExpression = path.node; // Entity.loaderWithAuthorizationResults(viewerContext)
      const loaderCallee = loaderCallExpression.callee; // Entity.loaderWithAuthorizationResults

      if (loaderCallee.type !== 'MemberExpression') {
        return;
      }

      // Make sure this is a static method call on an entity (not on an instance)
      // Typically entity names start with uppercase letter
      if (loaderCallee.object.type === 'Identifier') {
        const firstChar = loaderCallee.object.name[0];
        if (firstChar === firstChar?.toUpperCase()) {
          // Check if this loader uses knex-specific methods
          if (isKnexSpecificMethodUsed(j, path)) {
            // Transform Entity.loaderWithAuthorizationResults(viewerContext) → knexLoaderWithAuthorizationResults(Entity, viewerContext)
            const entityIdentifier = loaderCallee.object;
            const args = loaderCallExpression.arguments;

            j(path).replaceWith(
              j.callExpression(j.identifier('knexLoaderWithAuthorizationResults'), [
                entityIdentifier,
                ...args,
              ]),
            );
            transformed = true;
          }
        }
      }
    });

  return transformed;
}

function addKnexImportIfNeeded(
  j: API['jscodeshift'],
  root: Collection<any>,
  needsKnexLoader: boolean,
  needsKnexLoaderWithAuthorizationResults: boolean,
): void {
  if (!needsKnexLoader && !needsKnexLoaderWithAuthorizationResults) {
    return;
  }

  const specifiers: string[] = [];
  if (needsKnexLoader) {
    specifiers.push('knexLoader');
  }
  if (needsKnexLoaderWithAuthorizationResults) {
    specifiers.push('knexLoaderWithAuthorizationResults');
  }

  // Check if the import already exists
  const existingImport = root.find(j.ImportDeclaration, {
    source: { value: '@expo/entity-database-adapter-knex' },
  });

  if (existingImport.size() > 0) {
    // Add specifiers to existing import
    const importDecl = existingImport.get();
    const existingSpecifierNames = new Set(
      importDecl.node.specifiers?.map((s: any) => s.imported?.name).filter(Boolean) ?? [],
    );

    for (const specifier of specifiers) {
      if (!existingSpecifierNames.has(specifier)) {
        importDecl.node.specifiers?.push(j.importSpecifier(j.identifier(specifier)));
      }
    }
  } else {
    // Create new import declaration
    const importSpecifiers = specifiers.map((s) => j.importSpecifier(j.identifier(s)));
    const importDecl = j.importDeclaration(
      importSpecifiers,
      j.literal('@expo/entity-database-adapter-knex'),
    );

    // Add after the last import
    const allImports = root.find(j.ImportDeclaration);
    if (allImports.size() > 0) {
      allImports.at(-1).insertAfter(importDecl);
    } else {
      // No imports, add at the top
      root.get().node.program.body.unshift(importDecl);
    }
  }
}

export default function transformer(file: FileInfo, api: API, _options: Options): string {
  const j = api.jscodeshift;
  const root = j.withParser('ts')(file.source);

  const needsKnexLoader = transformLoaderToKnexLoader(j, root);
  const needsKnexLoaderWithAuthorizationResults =
    transformLoaderWithAuthorizationResultsToKnexLoaderWithAuthorizationResults(j, root);

  addKnexImportIfNeeded(j, root, needsKnexLoader, needsKnexLoaderWithAuthorizationResults);

  return root.toSource();
}
