import { EntityFieldDefinition } from '../../EntityFieldDefinition';

export default function describeFieldTestCase<T>(
  fieldDefinition: EntityFieldDefinition<T>,
  validValues: T[],
  invalidValues: any[],
  transformValues: {
    in: T;
    out: T;
  }[]
): void {
  describe(fieldDefinition.constructor.name, () => {
    if (validValues.length > 0) {
      test.each(validValues)(`${fieldDefinition.constructor.name}.valid %p`, (value) => {
        expect(fieldDefinition.validateAndTransformInputValue(value).isValid).toBe(true);
      });
    }

    if (invalidValues.length > 0) {
      test.each(invalidValues)(`${fieldDefinition.constructor.name}.invalid %p`, (value) => {
        expect(fieldDefinition.validateAndTransformInputValue(value).isValid).toBe(false);
      });
    }

    if (transformValues.length > 0) {
      test.each(transformValues)(`${fieldDefinition.constructor.name}.transformed %p`, (value) => {
        const result = fieldDefinition.validateAndTransformInputValue(value.in);
        expect(result.isValid).toBe(true);
        if (result.isValid) {
          expect(result.transformedValue).toEqual(value.out);
        }
      });
    }
  });
}
