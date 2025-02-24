import { API, Collection, FileInfo, Options } from 'jscodeshift';

function transformEnforcingEntityChainMethod(
  j: API['jscodeshift'],
  root: Collection<any>,
  type: 'enforcing' | 'withAuthorizationResults',
  crudType: 'creator' | 'updater',
  methodBefore: string,
  methodAfter: string,
): void {
  // Find all entity creator expressions of the form
  // `TestEntity.creator(viewerContext).setField('wat', 2).enforceCreateAsync()`
  root
    .find(j.CallExpression, {
      callee: {
        type: 'MemberExpression',
        property: {
          name: methodBefore,
        },
      },
    })
    .forEach((path) => {
      const enforceCreateAsyncCallExpression = path.node; // TestEntity.creator(viewerContext).setField('wat', 2).enforceCreateAsync()
      const enforceCreateAsyncCallee = enforceCreateAsyncCallExpression.callee; // TestEntity.creator(viewerContext).setField('wat', 2).enforceCreateAsync
      if (enforceCreateAsyncCallee.type !== 'MemberExpression') {
        return;
      }

      if (enforceCreateAsyncCallee.property.type !== 'Identifier') {
        return;
      }

      // traverse in until we find the first non-setField call
      let lastCallee = enforceCreateAsyncCallee;
      while (true) {
        // TestEntity.creator(viewerContext).setField('wat', 2)
        const maybeSetFieldObjectCallExpression = lastCallee.object;
        if (maybeSetFieldObjectCallExpression.type !== 'CallExpression') {
          break;
        }

        // TestEntity.creator(viewerContext).setField
        const maybeSetFieldObjectCallee = maybeSetFieldObjectCallExpression.callee;
        if (maybeSetFieldObjectCallee.type !== 'MemberExpression') {
          break;
        }

        const maybeSetFieldObjectCalleeProperty = maybeSetFieldObjectCallee.property;
        if (maybeSetFieldObjectCalleeProperty.type !== 'Identifier') {
          break;
        }

        if (maybeSetFieldObjectCalleeProperty.name === 'setField') {
          lastCallee = maybeSetFieldObjectCallee;
        } else {
          break;
        }
      }

      // TestEntity.creator(viewerContext)
      const maybeCreatorCallExpression = lastCallee.object;
      if (maybeCreatorCallExpression.type !== 'CallExpression') {
        return;
      }
      if (
        maybeCreatorCallExpression.callee.type !== 'MemberExpression' ||
        maybeCreatorCallExpression.callee.property.type !== 'Identifier' ||
        maybeCreatorCallExpression.callee.property.name !== crudType
      ) {
        return;
      }

      // TestEntity.creator(viewerContext).enforcing()
      const newCreatorCallExpression = j.callExpression(
        j.memberExpression(maybeCreatorCallExpression, j.identifier(type)),
        [],
      );

      // TestEntity.creator(viewerContext).enforcing().setField('wat', 2).createAsync()
      lastCallee.object = newCreatorCallExpression;

      // change enforceCreateAsync to createAsync at the end so if this returns early it doesn't mutate
      enforceCreateAsyncCallee.property.name = methodAfter;
    });
}

function transformEnforcingEntityDeleteMethod(
  j: API['jscodeshift'],
  root: Collection<any>,
  type: 'enforcing' | 'withAuthorizationResults',
  methodBefore: string,
  methodAfter: string,
): void {
  // Find all entity creator expressions of the form
  // `TestEntity.enforceDeleteAsync(entity)`
  root
    .find(j.CallExpression, {
      callee: {
        type: 'MemberExpression',
        property: {
          name: methodBefore,
        },
      },
    })
    .forEach((path) => {
      const enforceDeleteAsyncCallExpression = path.node; // TestEntity.enforceDeleteAsync(entity)
      const args = enforceDeleteAsyncCallExpression.arguments; // [entity]
      enforceDeleteAsyncCallExpression.arguments = [];
      const enforceDeleteAsyncCallee = enforceDeleteAsyncCallExpression.callee; // TestEntity.enforceDeleteAsync
      if (enforceDeleteAsyncCallee.type !== 'MemberExpression') {
        return;
      }

      // change enforceDeleteAsync to deleteAsync
      if (enforceDeleteAsyncCallee.property.type !== 'Identifier') {
        return;
      }
      enforceDeleteAsyncCallee.property.name = methodAfter;

      enforceDeleteAsyncCallee.object = j.callExpression(
        j.memberExpression(
          j.callExpression(
            j.memberExpression(enforceDeleteAsyncCallee.object, j.identifier('deleter')),
            args,
          ),
          j.identifier(type),
        ),
        [],
      );
    });
}

function transformAssociationLoaderMethod(j: API['jscodeshift'], root: Collection<any>): void {
  // Find all entity associationLoader expressions of the form
  // `this.associationLoader()`
  root
    .find(j.CallExpression, {
      callee: {
        type: 'MemberExpression',
        property: {
          name: 'associationLoader',
        },
      },
    })
    .forEach((path) => {
      const associationLoaderCallExpression = path.node; // this.associationLoader()

      // replace with this.associationLoader().withAuthorizationResults()
      path.replace(
        j.callExpression(
          j.memberExpression(
            associationLoaderCallExpression,
            j.identifier('withAuthorizationResults'),
          ),
          [],
        ),
      );
    });
}

export default function transformer(file: FileInfo, api: API, _options: Options): string {
  const j = api.jscodeshift;
  const root = j.withParser('ts')(file.source);

  // do authorization results first since it uses the same detection pattern as enforcing post-transform (i.e. it looks for createAsync)
  transformEnforcingEntityChainMethod(
    j,
    root,
    'withAuthorizationResults',
    'creator',
    'createAsync',
    'createAsync',
  );
  transformEnforcingEntityChainMethod(
    j,
    root,
    'withAuthorizationResults',
    'updater',
    'updateAsync',
    'updateAsync',
  );
  transformEnforcingEntityDeleteMethod(
    j,
    root,
    'withAuthorizationResults',
    'deleteAsync',
    'deleteAsync',
  );

  // now do enforcing
  transformEnforcingEntityChainMethod(
    j,
    root,
    'enforcing',
    'creator',
    'enforceCreateAsync',
    'createAsync',
  );
  transformEnforcingEntityChainMethod(
    j,
    root,
    'enforcing',
    'updater',
    'enforceUpdateAsync',
    'updateAsync',
  );
  transformEnforcingEntityDeleteMethod(j, root, 'enforcing', 'enforceDeleteAsync', 'deleteAsync');

  // association loader
  transformAssociationLoaderMethod(j, root);

  return root.toSource();
}
