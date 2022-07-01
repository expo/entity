import { describeFieldTestCase } from '@expo/entity';

import { IPAddressField } from '../IPAddressField';

describeFieldTestCase(
  new IPAddressField({ columnName: 'wat' }),
  [
    '192.168.1.1',
    '198.24.10.0/24',
    '10.0.0.0',
    '0:1:2:3:4:5:6:7',
    '1:2:3:4:5:6:7:8/64',
    'fedc:ba98:7654:3210:fedc:ba98:7654:3210',
  ],
  ['', 'abs', '0.0.0.x/0', '123.21.23', '1:2:3:4:5:6', '198.10/8'],
  [{ in: '192.168.1.1', out: '192.168.1.1' }]
);
