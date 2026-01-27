import { instance, mock, when } from 'ts-mockito';

import { EntityCompanionDefinition } from '../../EntityCompanionProvider';
import { EntityPrivacyPolicy } from '../../EntityPrivacyPolicy';
import { EntityQueryContext } from '../../EntityQueryContext';
import { ReadonlyEntity } from '../../ReadonlyEntity';
import { ViewerContext } from '../../ViewerContext';
import { describePrivacyPolicyRule } from '../../utils/__testfixtures__/PrivacyPolicyRuleTestUtils';
import { AllowIfInParentCascadeDeletionPrivacyPolicyRule } from '../AllowIfInParentCascadeDeletionPrivacyPolicyRule';

// Define test field types
type ParentFields = {
  id: string;
  name: string;
};

type ChildFields = {
  id: string;
  parent_id: string | null;
  parent_name: string | null;
};

// Create a mock privacy policy for the parent entity
class TestParentPrivacyPolicy extends EntityPrivacyPolicy<
  ParentFields,
  'id',
  ViewerContext,
  TestParentEntity
> {
  protected override readonly readRules = [];
  protected override readonly createRules = [];
  protected override readonly updateRules = [];
  protected override readonly deleteRules = [];
}

// Create a mock parent entity class with required static method
class TestParentEntity extends ReadonlyEntity<ParentFields, 'id', ViewerContext> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    ParentFields,
    'id',
    ViewerContext,
    TestParentEntity,
    TestParentPrivacyPolicy
  > {
    throw new Error('Not implemented for test');
  }
}

// Create a mock child entity class
class TestChildEntity extends ReadonlyEntity<ChildFields, 'id', ViewerContext> {}

// Mock parent entities
const parentEntityMock = mock(TestParentEntity);
when(parentEntityMock.getID()).thenReturn('5');
const parentEntity = instance(parentEntityMock);
Object.setPrototypeOf(parentEntity, TestParentEntity.prototype);

const otherParentEntityMock = mock(TestParentEntity);
when(otherParentEntityMock.getID()).thenReturn('6');
const otherParentEntity = instance(otherParentEntityMock);
Object.setPrototypeOf(otherParentEntity, TestParentEntity.prototype);

// Mock a non-parent entity (different class)
class UnrelatedOtherEntity extends ReadonlyEntity<{ id: string }, 'id', ViewerContext> {}
const unrelatedOtherEntityMock = mock(UnrelatedOtherEntity);
Object.setPrototypeOf(unrelatedOtherEntityMock, UnrelatedOtherEntity.prototype);

// Mock child entities
const childEntityMock = mock(TestChildEntity);
when(childEntityMock.getField('parent_id')).thenReturn('5');

const childEntityMockWithNullifiedField = mock(TestChildEntity);
when(childEntityMockWithNullifiedField.getField('parent_id')).thenReturn(null);

const childEntityDifferentParentMock = mock(TestChildEntity);
when(childEntityDifferentParentMock.getField('parent_id')).thenReturn('6');

describePrivacyPolicyRule(
  new AllowIfInParentCascadeDeletionPrivacyPolicyRule<
    ChildFields,
    'id',
    ViewerContext,
    TestChildEntity,
    ParentFields,
    'id',
    TestParentEntity,
    TestParentPrivacyPolicy
  >({
    fieldIdentifyingParentEntity: 'parent_id',
    parentEntityClass: TestParentEntity,
  }),
  {
    allowCases: [
      // parent id matches parent being deleted, field not yet nullified
      {
        viewerContext: instance(mock(ViewerContext)),
        queryContext: instance(mock(EntityQueryContext)),
        evaluationContext: {
          previousValue: instance(childEntityMock),
          cascadingDeleteCause: {
            entity: parentEntity,
            cascadingDeleteCause: null,
          },
        },
        entity: instance(childEntityMock),
      },
      // parent id matches parent being deleted, field null in current version but filled in previous version
      {
        viewerContext: instance(mock(ViewerContext)),
        queryContext: instance(mock(EntityQueryContext)),
        evaluationContext: {
          previousValue: instance(childEntityMock),
          cascadingDeleteCause: {
            entity: parentEntity,
            cascadingDeleteCause: null,
          },
        },
        entity: instance(childEntityMockWithNullifiedField),
      },
    ],
    skipCases: [
      // no cascading delete
      {
        viewerContext: instance(mock(ViewerContext)),
        queryContext: instance(mock(EntityQueryContext)),
        evaluationContext: {
          previousValue: null,
          cascadingDeleteCause: null,
        },
        entity: instance(childEntityMock),
      },
      // cascading delete not from parent entity class
      {
        viewerContext: instance(mock(ViewerContext)),
        queryContext: instance(mock(EntityQueryContext)),
        evaluationContext: {
          previousValue: null,
          cascadingDeleteCause: {
            entity: instance(unrelatedOtherEntityMock),
            cascadingDeleteCause: null,
          },
        },
        entity: instance(childEntityMock),
      },
      // cascading delete from different parent, field not nullified
      {
        viewerContext: instance(mock(ViewerContext)),
        queryContext: instance(mock(EntityQueryContext)),
        evaluationContext: {
          previousValue: null,
          cascadingDeleteCause: {
            entity: otherParentEntity,
            cascadingDeleteCause: null,
          },
        },
        entity: instance(childEntityMock),
      },
      // entity belongs to different parent
      {
        viewerContext: instance(mock(ViewerContext)),
        queryContext: instance(mock(EntityQueryContext)),
        evaluationContext: {
          previousValue: null,
          cascadingDeleteCause: {
            entity: parentEntity,
            cascadingDeleteCause: null,
          },
        },
        entity: instance(childEntityDifferentParentMock),
      },
      // parent id field undefined (null) and no previous value
      {
        viewerContext: instance(mock(ViewerContext)),
        queryContext: instance(mock(EntityQueryContext)),
        evaluationContext: {
          previousValue: null,
          cascadingDeleteCause: {
            entity: parentEntity,
            cascadingDeleteCause: null,
          },
        },
        entity: instance(childEntityMockWithNullifiedField),
      },
      // parent id now null but previous value different parent
      {
        viewerContext: instance(mock(ViewerContext)),
        queryContext: instance(mock(EntityQueryContext)),
        evaluationContext: {
          previousValue: instance(childEntityDifferentParentMock),
          cascadingDeleteCause: {
            entity: parentEntity,
            cascadingDeleteCause: null,
          },
        },
        entity: instance(childEntityMockWithNullifiedField),
      },
    ],
  },
);

// Test with custom lookup field (parentEntityLookupByField)
const parentEntityWithNameMock = mock(TestParentEntity);
when(parentEntityWithNameMock.getField('name')).thenReturn('test-name');
const parentEntityWithName = instance(parentEntityWithNameMock);
Object.setPrototypeOf(parentEntityWithName, TestParentEntity.prototype);

const childEntityWithNameRefMock = mock(TestChildEntity);
when(childEntityWithNameRefMock.getField('parent_name')).thenReturn('test-name');

const childEntityWithNameRefMockWithNullifiedField = mock(TestChildEntity);
when(childEntityWithNameRefMockWithNullifiedField.getField('parent_name')).thenReturn(null);

describePrivacyPolicyRule(
  new AllowIfInParentCascadeDeletionPrivacyPolicyRule<
    ChildFields,
    'id',
    ViewerContext,
    TestChildEntity,
    ParentFields,
    'id',
    TestParentEntity,
    TestParentPrivacyPolicy
  >({
    fieldIdentifyingParentEntity: 'parent_name',
    parentEntityClass: TestParentEntity,
    parentEntityLookupByField: 'name',
  }),
  {
    allowCases: [
      // parent name matches parent being deleted, field not yet nullified
      {
        viewerContext: instance(mock(ViewerContext)),
        queryContext: instance(mock(EntityQueryContext)),
        evaluationContext: {
          previousValue: instance(childEntityWithNameRefMock),
          cascadingDeleteCause: {
            entity: parentEntityWithName,
            cascadingDeleteCause: null,
          },
        },
        entity: instance(childEntityWithNameRefMock),
      },
      // parent name matches parent being deleted, field null in current version but filled in previous version
      {
        viewerContext: instance(mock(ViewerContext)),
        queryContext: instance(mock(EntityQueryContext)),
        evaluationContext: {
          previousValue: instance(childEntityWithNameRefMock),
          cascadingDeleteCause: {
            entity: parentEntityWithName,
            cascadingDeleteCause: null,
          },
        },
        entity: instance(childEntityWithNameRefMockWithNullifiedField),
      },
    ],
  },
);
