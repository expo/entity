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
  StrictEnumField,
} from '../EntityFields';
import describeFieldTestCase from '../utils/__testfixtures__/describeFieldTestCase';

class TestFieldDefinition extends EntityFieldDefinition<string, false> {
  protected validateInputValueInternal(value: string): boolean {
    return value === 'helloworld';
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
    expect(fieldDefinition.validateInputValue(null)).toBe(true);
  });

  test('validator returns true when value is undefined', () => {
    const fieldDefinition = new TestFieldDefinition({ columnName: 'wat', cache: true });
    expect(fieldDefinition.validateInputValue(undefined)).toBe(true);
  });

  test('validator returns false when value is invalid', () => {
    const fieldDefinition = new TestFieldDefinition({ columnName: 'wat', cache: true });
    expect(fieldDefinition.validateInputValue('nothelloworld')).toBe(false);
  });

  test('validator returns true when value is valid', () => {
    const fieldDefinition = new TestFieldDefinition({ columnName: 'wat', cache: true });
    expect(fieldDefinition.validateInputValue('helloworld')).toBe(true);
  });
});

describeFieldTestCase(new StringField({ columnName: 'wat' }), ['hello', ''], [1, true, {}, [[]]]);
describeFieldTestCase(
  new UUIDField({ columnName: 'wat' }),
  [
    uuidv1(),
    uuidv3('wat', uuidv3.DNS),
    uuidv4(),
    uuidv5('wat', uuidv5.DNS),
    /* UUIDv7 */ '018ebfda-dc80-782d-a891-22a0aa057d52',
  ],
  [uuidv4().replace('-', ''), '', 'hello'],
);
describeFieldTestCase(new DateField({ columnName: 'wat' }), [new Date()], [Date.now()]);
describeFieldTestCase(new BooleanField({ columnName: 'wat' }), [true, false], [0, 1, '']);
describeFieldTestCase(new IntField({ columnName: 'wat' }), [1], ['1', 0.5, true]);
describeFieldTestCase(new FloatField({ columnName: 'wat' }), [1, 0.5, -0.5], ['1']);
describeFieldTestCase(
  new StringArrayField({ columnName: 'wat' }),
  [[['what']] as any, [[]] as any], // jest test cases need extra wrapping array
  ['hello'],
);
describeFieldTestCase(new JSONObjectField({ columnName: 'wat' }), [{}], [true, 'hello']);
describeFieldTestCase(new EnumField({ columnName: 'wat' }), ['hello', 1], [true]);

enum TestEnum {
  HELLO = 'world',
  WHO = 'wat',
}

describeFieldTestCase(
  new StrictEnumField({ columnName: 'wat', enum: TestEnum }),
  [TestEnum.HELLO, TestEnum.WHO, 'world'],
  ['what', 1, true],
);
