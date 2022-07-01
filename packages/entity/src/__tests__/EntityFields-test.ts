import { v1 as uuidv1, v3 as uuidv3, v4 as uuidv4, v5 as uuidv5 } from 'uuid';

import { EntityFieldDefinition } from '../EntityFieldDefinition';
import {
  StringField,
  UUIDField,
  DateField,
  BooleanField,
  IntField,
  FloatField,
  StringArrayField,
  JSONObjectField,
  EnumField,
  JSONArrayField,
  MaybeJSONArrayField,
  LowercaseStringField,
} from '../EntityFields';
import describeFieldTestCase from '../utils/testing/describeFieldTestCase';

class TestFieldDefinition extends EntityFieldDefinition<string> {
  protected validateAndTransformInputValueInternal(
    value: string
  ): { isValid: false } | { isValid: true; transformedValue: string } {
    return value === 'helloworld' ? { isValid: true, transformedValue: value } : { isValid: false };
  }
}

describe(EntityFieldDefinition, () => {
  it('returns correct column name and defaults cache to false', () => {
    const fieldDefinition1 = new TestFieldDefinition({ columnName: 'wat' });
    expect(fieldDefinition1.columnName).toEqual('wat');
    expect(fieldDefinition1.cache).toEqual(false);

    const fieldDefinition2 = new TestFieldDefinition({ columnName: 'wat', cache: true });
    expect(fieldDefinition2.columnName).toEqual('wat');
    expect(fieldDefinition2.cache).toEqual(true);
  });

  test('validator returns true when value is null', () => {
    const fieldDefinition = new TestFieldDefinition({ columnName: 'wat', cache: true });
    expect(fieldDefinition.validateAndTransformInputValue(null).isValid).toBe(true);
  });

  test('validator returns true when value is undefined', () => {
    const fieldDefinition = new TestFieldDefinition({ columnName: 'wat', cache: true });
    expect(fieldDefinition.validateAndTransformInputValue(undefined).isValid).toBe(true);
  });

  test('validator returns false when value is invalid', () => {
    const fieldDefinition = new TestFieldDefinition({ columnName: 'wat', cache: true });
    expect(fieldDefinition.validateAndTransformInputValue('nothelloworld').isValid).toBe(false);
  });

  test('validator returns true when value is valid', () => {
    const fieldDefinition = new TestFieldDefinition({ columnName: 'wat', cache: true });
    expect(fieldDefinition.validateAndTransformInputValue('helloworld').isValid).toBe(true);
  });
});

describeFieldTestCase(
  new StringField({ columnName: 'wat' }),
  ['hello', ''],
  [1, true, {}, [[]]],
  [{ in: 'hello', out: 'hello' }]
);
describeFieldTestCase(
  new LowercaseStringField({ columnName: 'wat' }),
  ['HELLO', 'hello'],
  [1, true, {}, [[]]],
  [
    { in: 'low', out: 'low' },
    { in: 'UP', out: 'up' },
  ]
);
describeFieldTestCase(
  new UUIDField({ columnName: 'wat' }),
  [uuidv1(), uuidv3('wat', uuidv3.DNS), uuidv4(), uuidv5('wat', uuidv5.DNS)],
  [uuidv4().replace('-', ''), '', 'hello'],
  [uuidv4()].map((u) => ({ in: u, out: u }))
);
describeFieldTestCase(
  new DateField({ columnName: 'wat' }),
  [new Date()],
  [Date.now()],
  [new Date()].map((u) => ({ in: u, out: u }))
);
describeFieldTestCase(
  new BooleanField({ columnName: 'wat' }),
  [true, false],
  [0, 1, ''],
  [{ in: true, out: true }]
);
describeFieldTestCase(
  new IntField({ columnName: 'wat' }),
  [1],
  ['1', 0.5, true],
  [{ in: 1, out: 1 }]
);
describeFieldTestCase(
  new FloatField({ columnName: 'wat' }),
  [1, 0.5, -0.5],
  ['1'],
  [{ in: 3.5, out: 3.5 }]
);
describeFieldTestCase(
  new StringArrayField({ columnName: 'wat' }),
  [[['what']] as any, [[]] as any], // jest test cases need extra wrapping array
  ['hello'],
  [{ in: ['hello'], out: ['hello'] }]
);
describeFieldTestCase(
  new JSONObjectField({ columnName: 'wat' }),
  [{}],
  [true, 'hello'],
  [{ in: { hello: 1 }, out: { hello: 1 } }]
);
describeFieldTestCase(
  new EnumField({ columnName: 'wat' }),
  ['hello', 1],
  [true],
  [{ in: 1, out: 1 }]
);
describeFieldTestCase(
  new JSONArrayField({ columnName: 'wat' }),
  [[[1, 2]] as any, [['hello']] as any], // jest test cases need extra wrapping array
  [1, 'hello'],
  [{ in: [1, 2], out: [1, 2] }]
);
describeFieldTestCase(
  new MaybeJSONArrayField({ columnName: 'wat' }),
  [1, 'hello', [['hello']]], // jest test cases need extra wrapping array
  [],
  [{ in: 1, out: 1 }]
);
