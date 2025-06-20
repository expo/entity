import { describe, expect, it } from '@jest/globals';

import { TestMutationTrigger } from '../__testfixtures__/TestEntityWithMutationTriggers';
import { mergeEntityMutationTriggerConfigurations } from '../mergeEntityMutationTriggerConfigurations';

describe(mergeEntityMutationTriggerConfigurations, () => {
  it('successfully merges triggers', async () => {
    const firstAfter = new TestMutationTrigger('2');
    const secondAfter = new TestMutationTrigger('3');

    const merged = mergeEntityMutationTriggerConfigurations(
      {
        beforeAll: [new TestMutationTrigger('1')],
        afterAll: [firstAfter],
      },
      {
        afterAll: [secondAfter],
      },
    );

    expect(merged.beforeAll?.length).toBe(1);
    expect(merged.afterAll).toEqual([firstAfter, secondAfter]);
    expect(merged.beforeCreate?.length).toBeFalsy();
    expect(merged.afterCreate?.length).toBeFalsy();
    expect(merged.beforeUpdate?.length).toBeFalsy();
    expect(merged.afterUpdate?.length).toBeFalsy();
    expect(merged.beforeDelete?.length).toBeFalsy();
    expect(merged.afterDelete?.length).toBeFalsy();
    expect(merged.afterCommit?.length).toBeFalsy();
  });
});
