export function validateProtocol(protocol: any): boolean {
  if (!protocol || typeof protocol !== 'object') return false;

  const requiredFields = ['name', 'symbol', 'chains', 'slug'];
  const hasRequiredFields = requiredFields.every((field) => field in protocol);
  if (!hasRequiredFields) return false;

  if (typeof protocol.name !== 'string') return false;
  if (typeof protocol.symbol !== 'string') return false;
  if (!Array.isArray(protocol.chains)) return false;
  if (typeof protocol.slug !== 'string') return false;
  if (protocol.tvl !== null && typeof protocol.tvl !== 'number') return false;

  return true;
}

export function validateChartDataPoint(dataPoint: any): boolean {
  if (!dataPoint || typeof dataPoint !== 'object') return false;
  if (!('date' in dataPoint) || !('totalLiquidityUSD' in dataPoint)) return false;
  
  const date = typeof dataPoint.date === 'string' ? parseInt(dataPoint.date) : dataPoint.date;
  if (typeof date !== 'number') return false;
  if (!Number.isFinite(date)) return false;
  
  if (typeof dataPoint.totalLiquidityUSD !== 'number') return false;
  if (!Number.isFinite(dataPoint.totalLiquidityUSD)) return false;
  if (dataPoint.totalLiquidityUSD < 0) return false;
  
  return true;
}

export function validateArray(data: any[], validator: (item: any) => boolean): boolean {
  if (!Array.isArray(data)) return false;
  return data.every((item) => validator(item));
}

export function validateTimestamp(timestamp: number | string): boolean {
  const ts = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp;
  if (!Number.isFinite(ts)) return false;
  
  const minTimestamp = 1262304000;
  const maxTimestamp = 4102444800;
  const timestampInSeconds = ts > maxTimestamp ? ts / 1000 : ts;
  
  return timestampInSeconds > minTimestamp && timestampInSeconds < maxTimestamp;
}

export function validateTvlValue(tvl: number): boolean {
  if (!Number.isFinite(tvl)) return false;
  if (tvl < 0) return false;
  if (tvl > 10_000_000_000_000) return false;
  return true;
}
