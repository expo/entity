import { instance, mock, when } from 'ts-mockito';

import type { EntityPrivacyPolicyRuleEvaluationContext } from '../../EntityPrivacyPolicy.ts';
import { EntityQueryContext } from '../../EntityQueryContext.ts';
import { ViewerContext } from '../../ViewerContext.ts';
import { describePrivacyPolicyRule } from '../../utils/__testfixtures__/PrivacyPolicyRuleTestUtils.ts';
import type { TestFields } from '../../utils/__testfixtures__/TestEntity.ts';
import { TestEntity } from '../../utils/__testfixtures__/TestEntity.ts';
import { AlwaysAllowPrivacyPolicyRule } from '../AlwaysAllowPrivacyPolicyRule.ts';
import { EvaluateIfEntityFieldPredicatePrivacyPolicyRule } from '../EvaluateIfEntityFieldPredicatePrivacyPolicyRule.ts';

const entityBlahMock = mock(TestEntity);
when(entityBlahMock.getField('testIndexedField')).thenReturn('1');
const entityBlah = instance(entityBlahMock);

const entityFooMock = mock(TestEntity);
when(entityFooMock.getField('testIndexedField')).thenReturn('2');
const entityFoo = instance(entityFooMock);

describePrivacyPolicyRule<TestFields, 'customIdField', ViewerContext, TestEntity>(
  new EvaluateIfEntityFieldPredicatePrivacyPolicyRule<
    TestFields,
    'customIdField',
    ViewerContext,
    TestEntity,
    'testIndexedField'
  >('testIndexedField', (val) => val === '1', new AlwaysAllowPrivacyPolicyRule()),
  {
    allowCases: [
      {
        viewerContext: instance(mock(ViewerContext)),
        queryContext: instance(mock(EntityQueryContext)),
        evaluationContext:
          instance(mock<EntityPrivacyPolicyRuleEvaluationContext<any, any, any, any, any>>()),
        entity: entityBlah,
      },
    ],
    skipCases: [
      {
        viewerContext: instance(mock(ViewerContext)),
        queryContext: instance(mock(EntityQueryContext)),
        evaluationContext:
          instance(mock<EntityPrivacyPolicyRuleEvaluationContext<any, any, any, any, any>>()),
        entity: entityFoo,
      },
    ],
  },
);
