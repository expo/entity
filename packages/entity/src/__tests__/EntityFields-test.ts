import { describe, expect, it, test } from '@jest/globals';
import { v1 as uuidv1, v3 as uuidv3, v4 as uuidv4, v5 as uuidv5 } from 'uuid';

import { EntityFieldDefinition } from '../EntityFieldDefinition';
import {
  BooleanField,
  BufferField,
  DateField,
  EnumField,
  FloatField,
  IntField,
  JSONObjectField,
  StrictEnumField,
  StringArrayField,
  StringField,
  UUIDField,
} from '../EntityFields';
import { describeFieldTestCase } from '../utils/__testfixtures__/describeFieldTestCase';

class TestFieldDefinition extends EntityFieldDefinition<string, false> {
  protected validateNormalizedInputValueInternal(value: string): boolean {
    return value === 'helloworld';
  }

  protected normalizeInputValueInternal(value: string): string {
    return value.toLowerCase();
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
    expect(fieldDefinition.normalizeAndValidateInputValue(null)).toStrictEqual({
      valid: true,
      normalizedValue: null,
    });
  });

  test('validator returns true when value is undefined', () => {
    const fieldDefinition = new TestFieldDefinition({ columnName: 'wat', cache: true });
    expect(fieldDefinition.normalizeAndValidateInputValue(undefined)).toStrictEqual({
      valid: true,
      normalizedValue: undefined,
    });
  });

  test('validator returns false when value is invalid', () => {
    const fieldDefinition = new TestFieldDefinition({ columnName: 'wat', cache: true });
    expect(fieldDefinition.normalizeAndValidateInputValue('nothelloworld')).toStrictEqual({
      valid: false,
    });
  });

  test('validator returns true when value is valid', () => {
    const fieldDefinition = new TestFieldDefinition({ columnName: 'wat', cache: true });
    expect(fieldDefinition.normalizeAndValidateInputValue('helloworld')).toStrictEqual({
      valid: true,
      normalizedValue: 'helloworld',
    });
  });

  test('validator normalizes value', () => {
    const fieldDefinition = new TestFieldDefinition({ columnName: 'wat', cache: true });
    expect(fieldDefinition.normalizeAndValidateInputValue('HELLOWORLD')).toStrictEqual({
      valid: true,
      normalizedValue: 'helloworld',
    });
  });
});

describeFieldTestCase(
  new StringField({ columnName: 'wat' }),
  new Map([
    ['hello', 'hello'],
    ['', ''],
  ]),
  [1, true, {}, [[]]],
);

const v1 = uuidv1();
const v3 = uuidv3('wat', uuidv3.DNS);
const v4 = uuidv4();
const v5 = uuidv5('wat', uuidv5.DNS);
const v7 = '018ebfda-dc80-782d-a891-22a0aa057d52';

describeFieldTestCase(
  new UUIDField({ columnName: 'wat' }),
  new Map([
    [v1, v1],
    [v3, v3],
    [v4, v4],
    [v5, v5],
    [v7, v7],
    // uppercase should normalize to lowercase
    [v1.toUpperCase(), v1],
  ]),
  [uuidv4().replace('-', ''), '', 'hello'],
);

const now = new Date();

describeFieldTestCase(new DateField({ columnName: 'wat' }), new Map([[now, now]]), [Date.now()]);
describeFieldTestCase(
  new BooleanField({ columnName: 'wat' }),
  new Map([
    [true, true],
    [false, false],
  ]),
  [0, 1, ''],
);
describeFieldTestCase(new IntField({ columnName: 'wat' }), new Map([[1, 1]]), ['1', 0.5, true]);
describeFieldTestCase(
  new FloatField({ columnName: 'wat' }),
  new Map([
    [1, 1],
    [0.5, 0.5],
    [-0.5, -0.5],
  ]),
  ['1'],
);
describeFieldTestCase(
  new StringArrayField({ columnName: 'wat' }),
  new Map([
    [['what'] as any, ['what'] as any],
    [[] as any, [] as any],
  ]),
  ['hello'],
);
describeFieldTestCase(new JSONObjectField({ columnName: 'wat' }), new Map<any, any>([[{}, {}]]), [
  true,
  'hello',
]);
describeFieldTestCase(
  new EnumField({ columnName: 'wat' }),
  new Map<string | number, string | number>([
    ['hello', 'hello'],
    [1, 1],
  ]),
  [true],
);

enum TestEnum {
  HELLO = 'world',
  WHO = 'wat',
}

describeFieldTestCase(
  new StrictEnumField({ columnName: 'wat', enum: TestEnum }),
  new Map([
    [TestEnum.HELLO, TestEnum.HELLO],
    [TestEnum.WHO, TestEnum.WHO],
    ['world', 'world'],
  ]),
  ['what', 1, true],
);

describeFieldTestCase(
  new BufferField({ columnName: 'wat' }),
  new Map([[Buffer.from('hello'), Buffer.from('hello')]]),
  ['hello', 1, true],
);
