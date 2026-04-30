jest.mock('../../utils/r2', () => ({
  getR2JSONString: jest.fn(),
}));

jest.mock('../cache/file-cache', () => ({
  storeRouteData: jest.fn(),
}));

import { getR2JSONString } from '../../utils/r2';
import { storeRouteData } from '../cache/file-cache';
import { storeEmissionsCache } from './emissionsUtils';

const mockedGetR2JSONString = getR2JSONString as jest.MockedFunction<typeof getR2JSONString>;
const mockedStoreRouteData = storeRouteData as jest.MockedFunction<typeof storeRouteData>;

const timestamp = (date: string) => Math.floor(Date.parse(`${date}T00:00:00Z`) / 1000);

describe('storeEmissionsCache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('pre-indexed breakdown aggregation matches previous timestamp lookup semantics', async () => {
    const janTimestamp = timestamp('2024-01-15');
    const febTimestamp = timestamp('2024-02-15');
    const unusedTimestamp = timestamp('2024-03-15');

    mockedGetR2JSONString.mockImplementation(async (key: string) => {
      if (key === 'emissionsProtocolsList') return ['test-protocol'] as any;
      if (key === 'emissions/test-protocol') {
        return {
          unlockUsdChart: [
            [janTimestamp, 100],
            [febTimestamp, 200],
          ],
          componentData: {
            sections: {
              sectionA: {
                components: {
                  incentiveA: {
                    name: 'Incentive A',
                    methodology: 'A methodology',
                    isIncentive: true,
                    unlockUsdChart: [
                      [janTimestamp, 10],
                      [janTimestamp, 999], // previous .find() implementation used the first match
                      [febTimestamp, 20],
                      [unusedTimestamp, 30],
                    ],
                  },
                  incentiveB: {
                    name: 'Incentive B',
                    methodology: 'B methodology',
                    isIncentive: true,
                    unlockUsdChart: [[janTimestamp, 1]],
                  },
                  nonIncentive: {
                    name: 'Non Incentive',
                    methodology: 'Non incentive methodology',
                    isIncentive: false,
                    unlockUsdChart: [[janTimestamp, 500]],
                  },
                },
              },
            },
          },
        } as any;
      }
      return null as any;
    });

    await expect(storeEmissionsCache()).resolves.toEqual({ error: null });

    expect(mockedStoreRouteData).toHaveBeenCalledTimes(1);
    expect(mockedStoreRouteData).toHaveBeenCalledWith('emissions/test-protocol', {
      id: 'test-protocol',
      breakdownMethodology: {
        'Incentive A': 'A methodology',
        'Incentive B': 'B methodology',
        'Non Incentive': 'Non incentive methodology',
      },
      monthly: {
        '2024-01': {
          value: 100,
          'by-label': {
            'Incentive A': 10,
            'Incentive B': 1,
          },
        },
        '2024-02': {
          value: 200,
          'by-label': {
            'Incentive A': 20,
          },
        },
      },
      quarterly: {
        '2024-Q1': {
          value: 300,
          'by-label': {
            'Incentive A': 30,
            'Incentive B': 1,
          },
        },
      },
      yearly: {
        '2024': {
          value: 300,
          'by-label': {
            'Incentive A': 30,
            'Incentive B': 1,
          },
        },
      },
    });
  });
});
