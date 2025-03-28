import isEqualWith from 'lodash/isEqualWith';
import { Matcher } from 'ts-mockito/lib/matcher/type/Matcher';

import { SerializableKeyMap } from '../../utils/collections/SerializableKeyMap';
import { SingleFieldHolder, SingleFieldValueHolder } from '../SingleFieldHolder';

export function isEqualWithEntityAware(expected: any, actual: any): boolean {
  return isEqualWith(expected, actual, (expected: any, actual: any): boolean | undefined => {
    if (expected instanceof Matcher) {
      return expected.match(actual);
    }

    if (expected instanceof SingleFieldHolder && actual instanceof SingleFieldHolder) {
      return expected.fieldName === actual.fieldName;
    }

    if (expected instanceof SingleFieldValueHolder && actual instanceof SingleFieldValueHolder) {
      return expected.fieldValue === actual.fieldValue;
    }

    if (expected instanceof SerializableKeyMap && actual instanceof SerializableKeyMap) {
      for (const [key, value] of expected.entries()) {
        if (!actual.has(key) || !isEqualWith(value, actual.get(key))) {
          return false;
        }
      }
      return true;
    }

    return undefined;
  });
}

export class DeepEqualEntityAwareMatcher<T> extends Matcher {
  constructor(private readonly expectedValue: T) {
    super();
  }

  public override match(value: any): boolean {
    return isEqualWithEntityAware(this.expectedValue, value);
  }

  public override toString(): string {
    if (this.expectedValue instanceof Array) {
      return `deepEqualEntityAware([${this.expectedValue}])`;
    } else {
      return `deepEqualEntityAware(${this.expectedValue})`;
    }
  }
}

export function deepEqualEntityAware<T>(expectedValue: T): T {
  return new DeepEqualEntityAwareMatcher(expectedValue) as any;
}
