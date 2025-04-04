import { EntityFieldDefinition } from '@expo/entity';
import { Address4, Address6 } from 'ip-address';

export class IPAddressField<TRequireExplicitCache extends boolean> extends EntityFieldDefinition<
  string,
  TRequireExplicitCache
> {
  protected validateInputValueInternal(value: string): boolean {
    return Address4.isValid(value) || Address6.isValid(value);
  }
}
