const { get } = require('../helper/http');

async function fetch() {
  const data = await get('https://api.kyrr.io/orderly/volume');
  return {
    dailyVolume: data.daily_volume_usd,
    totalVolume: data.total_volume_usd,
  };
}

module.exports = {
  fetch,
  start: 1718323200, // 14 June 2024
  methodology: 'Volume is fetched from Orderly-backed unified liquidity API used by Kyrr.'
};

