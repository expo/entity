import { EntityFieldDefinition } from '../../EntityFieldDefinition';

export default function describeFieldTestCase<T>(
  fieldDefinition: EntityFieldDefinition<T, any>,
  validValues: T[],
  invalidValues: any[],
): void {
  describe(fieldDefinition.constructor.name, () => {
    if (validValues.length > 0) {
      test.each(validValues)(`${fieldDefinition.constructor.name}.valid %p`, (value) => {
        expect(fieldDefinition.validateInputValue(value)).toBe(true);
      });
    }

    if (invalidValues.length > 0) {
      test.each(invalidValues)(`${fieldDefinition.constructor.name}.invalid %p`, (value) => {
        expect(fieldDefinition.validateInputValue(value)).toBe(false);
      });
    }
  });
}
