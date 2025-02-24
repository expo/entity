import { API, Collection, FileInfo, Options } from 'jscodeshift';

function transformWithAuthorizationResultsEntityChainMethod(
  j: API['jscodeshift'],
  root: Collection<any>,
): void {
  // Find all entity expressions of the form
  // `TestEntity.thing(viewerContext).withAuthorizationResults()`
  root
    .find(j.CallExpression, {
      callee: {
        type: 'MemberExpression',
        property: {
          name: 'withAuthorizationResults',
        },
      },
    })
    .forEach((path) => {
      const withAuthorizationResultsCallExpression = path.node; // TestEntity.thing(viewerContext).withAuthorizationResults()
      const withAuthorizationResultsCallee = withAuthorizationResultsCallExpression.callee; // TestEntity.thing(viewerContext).withAuthorizationResults
      if (withAuthorizationResultsCallee.type !== 'MemberExpression') {
        return;
      }

      const thingCallExpression = withAuthorizationResultsCallee.object; // TestEntity.thing(viewerContext)
      if (thingCallExpression.type !== 'CallExpression') {
        return;
      }
      const thingCallee = thingCallExpression.callee; // TestEntity.thing
      if (thingCallee.type !== 'MemberExpression') {
        return;
      }

      if (thingCallee.property.type !== 'Identifier') {
        return;
      }

      const newCreatorCalleeName = thingCallee.property.name + 'WithAuthorizationResults';
      thingCallee.property.name = newCreatorCalleeName;

      path.replace(thingCallExpression);
    });
}

function transformEnforcingEntityChainMethod(j: API['jscodeshift'], root: Collection<any>): void {
  // Find all entity expressions of the form
  // `TestEntity.thing(viewerContext).enforcing()`
  root
    .find(j.CallExpression, {
      callee: {
        type: 'MemberExpression',
        property: {
          name: 'enforcing',
        },
      },
    })
    .forEach((path) => {
      const enforcingCallExpression = path.node; // TestEntity.thing(viewerContext).enforcing()
      const enforcingCallee = enforcingCallExpression.callee; // TestEntity.thing(viewerContext).enforcing
      if (enforcingCallee.type !== 'MemberExpression') {
        return;
      }

      const thingCallExpression = enforcingCallee.object; // TestEntity.thing(viewerContext)
      if (thingCallExpression.type !== 'CallExpression') {
        return;
      }

      path.replace(thingCallExpression);
    });
}

export default function transformer(file: FileInfo, api: API, _options: Options): string {
  const j = api.jscodeshift;
  const root = j.withParser('ts')(file.source);

  transformWithAuthorizationResultsEntityChainMethod(j, root);
  transformEnforcingEntityChainMethod(j, root);

  return root.toSource();
}
