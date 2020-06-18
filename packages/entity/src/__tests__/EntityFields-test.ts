import { EntityFieldDefinition } from '../EntityFields';

class TestFieldDefinition extends EntityFieldDefinition<any> {}

describe(EntityFieldDefinition, () => {
  it('returns correct column name and defaults cache to false', () => {
    const fieldDefinition1 = new TestFieldDefinition({ columnName: 'wat' });
    expect(fieldDefinition1.columnName).toEqual('wat');
    expect(fieldDefinition1.cache).toEqual(false);

    const fieldDefinition2 = new TestFieldDefinition({ columnName: 'wat', cache: true });
    expect(fieldDefinition2.columnName).toEqual('wat');
    expect(fieldDefinition2.cache).toEqual(true);
  });

  it('defaults validator to no-op', () => {
    const fieldDefinition = new TestFieldDefinition({ columnName: 'wat', cache: true });
    expect(fieldDefinition.validator).toEqual({});

    const fn = (): boolean => false;
    const fieldDefinition2 = new TestFieldDefinition({
      columnName: 'wat',
      cache: true,
      validator: {
        read: fn,
      },
    });
    expect(fieldDefinition2.validator.read).toEqual(fn);
  });
});
