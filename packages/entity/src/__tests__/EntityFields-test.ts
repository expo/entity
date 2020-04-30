import { EntityFieldDefinition } from '../EntityFields';

class TestFieldDefinition extends EntityFieldDefinition {}

describe(EntityFieldDefinition, () => {
  it('returns correct column name and defaults cache to false', () => {
    const fieldDefinition1 = new TestFieldDefinition({ columnName: 'wat' });
    expect(fieldDefinition1.columnName).toEqual('wat');
    expect(fieldDefinition1.cache).toEqual(false);

    const fieldDefinition2 = new TestFieldDefinition({ columnName: 'wat', cache: true });
    expect(fieldDefinition2.columnName).toEqual('wat');
    expect(fieldDefinition2.cache).toEqual(true);
  });
});
