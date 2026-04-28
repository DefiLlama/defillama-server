import { shouldEmitRwaBreakdownItem } from './chartBreakdown';

describe('rwa chart breakdown', () => {
  it('does not emit zero-only pre-launch rows', () => {
    const startedItems = new Set<string>();

    expect(
      shouldEmitRwaBreakdownItem(startedItems, 'PreStocks', {
        onChainMcap: 0,
        activeMcap: 0,
        defiActiveTvl: 0,
      })
    ).toBe(false);
    expect(startedItems.has('PreStocks')).toBe(false);
  });

  it('emits rows once an item has non-zero data', () => {
    const startedItems = new Set<string>();

    expect(
      shouldEmitRwaBreakdownItem(startedItems, 'PreStocks', {
        onChainMcap: 0,
        activeMcap: 11_780_000,
        defiActiveTvl: 0,
      })
    ).toBe(true);
    expect(startedItems.has('PreStocks')).toBe(true);
  });

  it('keeps zero rows after an item has started', () => {
    const startedItems = new Set<string>(['PreStocks']);

    expect(
      shouldEmitRwaBreakdownItem(startedItems, 'PreStocks', {
        onChainMcap: 0,
        activeMcap: 0,
        defiActiveTvl: 0,
      })
    ).toBe(true);
  });
});
