import { GenericSecondaryEntityCache } from '@expo/entity';
import {
  GenericLocalMemoryCacher,
  LocalMemoryCache,
} from '@expo/entity-cache-adapter-local-memory';

/**
 * A local memory {@link GenericSecondaryEntityCache}.
 */
export default class LocalMemorySecondaryEntityCache<
  TFields,
  TLoadParams
> extends GenericSecondaryEntityCache<TFields, TLoadParams> {
  constructor(localMemoryCache: LocalMemoryCache<TFields>) {
    super(new GenericLocalMemoryCacher(localMemoryCache), (params) => JSON.stringify(params));
  }
}
