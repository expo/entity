import { describe, expect, it } from '@jest/globals';

import { CompositeFieldHolder, CompositeFieldValueHolder } from '../CompositeFieldHolder';

describe(CompositeFieldHolder, () => {
  it('is order-agnostic for serialization', () => {
    const compositeFieldHolder = new CompositeFieldHolder(['field1', 'field2']);
    const compositeFieldHolder2 = new CompositeFieldHolder(['field2', 'field1']);

    expect(compositeFieldHolder.serialize()).toEqual(compositeFieldHolder2.serialize());
  });
});

describe(CompositeFieldValueHolder, () => {
  it('is order-agnostic for serialization', () => {
    const compositeFieldValueHolder = new CompositeFieldValueHolder({
      field1: 'value1',
      field2: 'value2',
    });
    const compositeFieldValueHolder2 = new CompositeFieldValueHolder({
      field2: 'value2',
      field1: 'value1',
    });

    expect(compositeFieldValueHolder.serialize()).toEqual(compositeFieldValueHolder2.serialize());
  });
});
