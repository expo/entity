import { mock, instance, when } from 'ts-mockito';

import { EntityPrivacyPolicyRuleEvaluationContext } from '../../EntityPrivacyPolicy';
import { EntityQueryContext } from '../../EntityQueryContext';
import { ViewerContext } from '../../ViewerContext';
import { describePrivacyPolicyRule } from '../../utils/__testfixtures__/PrivacyPolicyRuleTestUtils';
import { TestEntity, TestFields } from '../../utils/__testfixtures__/TestEntity';
import { AlwaysAllowPrivacyPolicyRule } from '../AlwaysAllowPrivacyPolicyRule';
import { EvaluateIfEntityFieldPredicatePrivacyPolicyRule } from '../EvaluateIfEntityFieldPredicatePrivacyPolicyRule';

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
