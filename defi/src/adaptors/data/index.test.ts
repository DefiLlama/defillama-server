import { AdapterType } from '@defillama/dimension-adapters/adapters/types';
import data from './index'

describe("Protocol adaptor list is complete", () => {
    test.each(Object.values(AdapterType))(
        '%s',
        (type) => {
            expect(data(type).default)
                .toMatchSnapshot()
        }
      );
});