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

function transformLoaderToKnexLoader(j: API['jscodeshift'], root: Collection<any>): void {
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
            // Rename loader to knexLoader
            if (loaderCallee.property.type === 'Identifier') {
              loaderCallee.property.name = 'knexLoader';
            }
          }
        }
      }
    });
}

function transformLoaderWithAuthorizationResultsToKnexLoaderWithAuthorizationResults(
  j: API['jscodeshift'],
  root: Collection<any>,
): void {
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
            // Rename loaderWithAuthorizationResults to knexLoaderWithAuthorizationResults
            if (loaderCallee.property.type === 'Identifier') {
              loaderCallee.property.name = 'knexLoaderWithAuthorizationResults';
            }
          }
        }
      }
    });
}

export default function transformer(file: FileInfo, api: API, _options: Options): string {
  const j = api.jscodeshift;
  const root = j.withParser('ts')(file.source);

  transformLoaderToKnexLoader(j, root);
  transformLoaderWithAuthorizationResultsToKnexLoaderWithAuthorizationResults(j, root);

  return root.toSource();
}
