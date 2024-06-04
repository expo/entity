import { describeFieldTestCase } from '@expo/entity';

import { BigIntField, JSONArrayField, MaybeJSONArrayField } from '../EntityFields';

describeFieldTestCase(
  new JSONArrayField({ columnName: 'wat' }),
  [[[1, 2]] as any, [['hello']] as any],
  [1, 'hello'],
);
describeFieldTestCase(
  new MaybeJSONArrayField({ columnName: 'wat' }),
  [1, 'hello', [['hello']]],
  [],
);
describeFieldTestCase(
  new BigIntField({ columnName: 'wat' }),
  ['123457682149816498126412896', '123', '-1', '-124147812641876482716841'],
  [1, false, -1, 1e6, {}],
);
