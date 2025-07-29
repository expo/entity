import { BufferField, DateField } from '@expo/entity';

export const redisTransformerMap = new Map([
  [
    DateField.name,
    {
      /**
       * All Redis fields are serialized to JSON before being written.
       * In the case of dates, they need to be explicitly reconstructed
       * as JavaScript Date objects upon retrieval. We also explicitly
       * serialize them to ISO strings to ensure no underlying Redis
       * changes affect the fields.
       *
       * Write behavior: Value to write will always be either a Date or null.
       *                 Behavior is to pass through null and convert dates
       *                 to ISO strings.
       * Read behavior:  Value will always be either null or an ISO string.
       *                 behavior is to convert ISO strings back into Date
       *                 objects and pass through null.
       */
      write: (val: Date) => val?.toISOString() ?? null,
      read: (val: any) => (val ? new Date(val) : val),
    },
  ],
  [
    BufferField.name,
    {
      /**
       * All Redis fields are serialized to JSON before being written.
       * In the case of buffers, they need to be explicitly reconstructed
       * as JavaScript Buffer objects upon retrieval. We also explicitly
       * serialize them to base64 strings to ensure no underlying Redis
       * changes affect the fields.
       *
       * Write behavior: Value to write will always be either a Buffer or null.
       *                 Behavior is to pass through null and convert buffers
       *                 to base64 strings.
       * Read behavior:  Value will always be either null or a base64 string.
       *                 behavior is to convert base64 strings back into Buffer
       *                 objects and pass through null.
       */
      write: (val: Buffer) => (val ? val.toString('base64') : null),
      read: (val: any) => (val ? Buffer.from(val, 'base64') : val),
    },
  ],
]);
