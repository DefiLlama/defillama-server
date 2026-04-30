import { padAddress } from "./coingeckoPlatforms";

describe('padAddress', () => {
  it('preserves all characters when input has 0x prefix', () => {
    expect(padAddress('0xabcd', 8)).toBe('0x00abcd');
  });

  it('preserves all characters when input has no prefix (regression case)', () => {
    expect(padAddress('1234', 8)).toBe('0x001234');
  });

  it('returns just the prefix and zeros when input is empty', () => {
    expect(padAddress('', 4)).toBe('0x00');
  });

  it('handles input that equals just the prefix', () => {
    expect(padAddress('0x', 4)).toBe('0x00');
  });

  it('pads to the default length of 66 when called without explicit length', () => {
    const result = padAddress('0xabcd');
    expect(result).toHaveLength(66);
    expect(result).toMatch(/^0x0+abcd$/);
  });
});
