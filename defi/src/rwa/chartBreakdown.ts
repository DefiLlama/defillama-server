import { toFiniteNumberOrZero } from './utils';

export type RwaBreakdownMetricValues = {
  onChainMcap?: unknown;
  activeMcap?: unknown;
  defiActiveTvl?: unknown;
};

export function hasRwaBreakdownMetricData(values: RwaBreakdownMetricValues): boolean {
  return toFiniteNumberOrZero(values.onChainMcap) !== 0 || toFiniteNumberOrZero(values.activeMcap) !== 0 || toFiniteNumberOrZero(values.defiActiveTvl) !== 0;
}

export function shouldEmitRwaBreakdownItem(startedItems: Set<string>, itemKey: string, values: RwaBreakdownMetricValues): boolean {
  if (hasRwaBreakdownMetricData(values)) {
    startedItems.add(itemKey);
    return true;
  }

  return startedItems.has(itemKey);
}
