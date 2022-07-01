import { EntityFieldDefinition } from '@expo/entity';
import { Address4, Address6 } from 'ip-address';

export class IPAddressField extends EntityFieldDefinition<string> {
  protected validateAndTransformInputValueInternal(
    value: string
  ): { isValid: false } | { isValid: true; transformedValue: string } {
    return Address4.isValid(value) || Address6.isValid(value)
      ? { isValid: true, transformedValue: value }
      : { isValid: false };
  }
}
