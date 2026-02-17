import pLimit from 'p-limit';
import { EmissionsProtocolData } from '../../adaptors/data/types';
import { getTimestampAtStartOfMonth, getTimestampAtStartOfQuarter } from '../../utils/date';
import { getR2JSONString } from '../../utils/r2';
import { storeRouteData } from '../cache/file-cache';

const LIMIT = 10; // fetch 10 protocols onces
const CACHE_FOLDER = 'emissions'; // path will be .api2-cache/build/emissions
const PROTOCOL_CACHE_FILE = (protocol: string) => `${CACHE_FOLDER}/${protocol}`;

export async function storeEmissionsCache(): Promise<{error: string | null}> {
  async function updateProtocolEmissionsData(emissionsProtocolId: string) {
    const emissionsProtocolData: EmissionsProtocolData = {
      id: emissionsProtocolId,
      monthly: {},
      quarterly: {},
      yearly: {},
    };
    
    const _emissionsData: any = await getR2JSONString(`emissions/${emissionsProtocolId}`);
    if (_emissionsData && _emissionsData.unlockUsdChart) {
      const hasBreakdownData = !!_emissionsData.componentData && !!_emissionsData.componentData.sections;

      if (hasBreakdownData) {
        const breakdownMethodology: Record<string, string> = {};
        for (const section of Object.values(_emissionsData.componentData.sections)) {
          const s = section as any;
          for (const component of Object.values(s.components || {})) {
            const c = component as any;
            if (c.methodology && c.name) breakdownMethodology[c.name] = c.methodology;
          }
        }
        if (Object.keys(breakdownMethodology).length) emissionsProtocolData.breakdownMethodology = breakdownMethodology;
      }

      for (const [timestamp, value] of _emissionsData.unlockUsdChart) {
        const firstDayOfMonthDate = getTimestampAtStartOfMonth(timestamp);
        const firstDayOfQuarterDate = getTimestampAtStartOfQuarter(firstDayOfMonthDate);
        
        const keyMaps: Record<string, string> = {
          monthly: `${new Date(firstDayOfMonthDate * 1e3).toISOString().slice(0, 7)}`,
          quarterly: `${new Date(firstDayOfMonthDate * 1e3).getUTCFullYear()}-Q${Math.ceil((new Date(firstDayOfQuarterDate * 1e3).getUTCMonth() + 1) / 3)}`,
          yearly: String(new Date(firstDayOfMonthDate * 1e3).getUTCFullYear()),
        };
        
        for (const [timeframe, timeframeKey] of Object.entries(keyMaps)) {
          (emissionsProtocolData as any)[timeframe][timeframeKey] = (emissionsProtocolData as any)[timeframe][timeframeKey] || { value: 0 };
          (emissionsProtocolData as any)[timeframe][timeframeKey].value += Number(value);
          
          if (hasBreakdownData) {
            (emissionsProtocolData as any)[timeframe][timeframeKey]['by-label'] = (emissionsProtocolData as any)[timeframe][timeframeKey]['by-label'] || {};
            const breakdownLabels: any = findBreakdownLabelsAtTimestamp(_emissionsData.componentData.sections, timestamp);
            for (const [label, value] of Object.entries(breakdownLabels)) {
              (emissionsProtocolData as any)[timeframe][timeframeKey]['by-label'][label] = (emissionsProtocolData as any)[timeframe][timeframeKey]['by-label'][label] || 0;
              (emissionsProtocolData as any)[timeframe][timeframeKey]['by-label'][label] += Number(value);
            }
          }
        }
      }
    }
    
    await storeRouteData(PROTOCOL_CACHE_FILE(emissionsProtocolId), emissionsProtocolData);
  }
  
  // helper function
  function findBreakdownLabelsAtTimestamp(sections: any, timestamp: number): any {
    const labels: Record<string, number> = {};
    for (const section of Object.values(sections)) {
      for (const component of Object.values((section as any).components)) {
        const compomentItem = component as any;
        if (compomentItem.name && compomentItem.unlockUsdChart) {
          const label = compomentItem.name;
          const item = compomentItem.unlockUsdChart.find((item: any) => item[0] === timestamp)
          if (item) {
            labels[label] = Number(item[1]);
          }
        }
      }
    }
    return labels;
  }

  try {
    const emissionsProtocolsList: Array<string> = await getR2JSONString('emissionsProtocolsList');
    
    if (emissionsProtocolsList.length === 0) {
      throw Error('Got emissions protocols empty list');
    }

    const limit = pLimit(LIMIT);
    const limitedPromises = emissionsProtocolsList.map(id => {
      return limit(() => updateProtocolEmissionsData(id))
    })
    await Promise.all(limitedPromises);
    return { error: null }
  } catch (e: any) {
    return { error: e.message }
  }
}
