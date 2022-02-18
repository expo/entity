import ComposedPartsCacher from './ComposedPartsCacher';
import GenericSecondaryEntityCache from './GenericSecondaryEntityCache';
import PartsCacher, { Parts } from './PartsCacher';

/**
 * TODO: put this in www
 */
export default class LocalMemoryAndRedisSecondaryEntityCache<
  TFields,
  TLoadParams
> extends GenericSecondaryEntityCache<TFields, TLoadParams> {
  constructor(
    localMemoryPartsCacher: PartsCacher<TFields>,
    redisPartsCacher: PartsCacher<TFields>,
    getParts: (params: Readonly<TLoadParams>) => Parts
  ) {
    super(new ComposedPartsCacher([localMemoryPartsCacher, redisPartsCacher]), getParts);
  }
}
