import { describe, expect, test } from '@jest/globals';

import { EntityFieldDefinition } from '../../EntityFieldDefinition';

export function describeFieldTestCase<T>(
  fieldDefinition: EntityFieldDefinition<T, any>,
  validInputsToExpectedNormalizedValues: ReadonlyMap<T, T>,
  invalidValues: any[],
): void {
  describe(fieldDefinition.constructor.name, () => {
    if (validInputsToExpectedNormalizedValues.size > 0) {
      test.each(Array.from(validInputsToExpectedNormalizedValues.entries()))(
        `${fieldDefinition.constructor.name}.valid %p`,
        (input, expectedNormalizedValue) => {
          expect(fieldDefinition.normalizeAndValidateInputValue(input)).toStrictEqual({
            valid: true,
            normalizedValue: expectedNormalizedValue,
          });
        },
      );
    }

    if (invalidValues.length > 0) {
      test.each(invalidValues)(`${fieldDefinition.constructor.name}.invalid %p`, (value) => {
        expect(fieldDefinition.normalizeAndValidateInputValue(value)).toStrictEqual({
          valid: false,
        });
      });
    }
  });
}
