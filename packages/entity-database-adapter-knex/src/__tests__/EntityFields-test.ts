import { describeFieldTestCase } from '@expo/entity';

import { JSONArrayField, MaybeJSONArrayField } from '../EntityFields';

describeFieldTestCase(
  new JSONArrayField({ columnName: 'wat' }),
  [[[1, 2]] as any, [['hello']] as any], // jest test cases need extra wrapping array
  [1, 'hello']
);
describeFieldTestCase(
  new MaybeJSONArrayField({ columnName: 'wat' }),
  [1, 'hello', [['hello']]], // jest test cases need extra wrapping array
  []
);
