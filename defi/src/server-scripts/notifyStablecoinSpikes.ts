import axios from 'axios'
import { sendMessage } from '../utils/discord';

async function fetchStablecoinData() {

  const currentHour = new Date().getUTCHours();

  // now this check runs every 4th hour
  if (currentHour % 4 !== 0) {
    console.log('Skipping stablecoin spike check');
    return []
  }

  try {
    const response = await axios.get('https://stablecoins.llama.fi/stablecoins');
    const data = response.data;

    const filteredData = data.peggedAssets.filter((asset: any) => {
      const circulatingUSD = asset.circulating?.peggedUSD;
      const circulatingPrevDayUSD = asset.circulatingPrevDay?.peggedUSD;
      if (!circulatingPrevDayUSD) return false;
      asset.ratioChange = Number(circulatingUSD * 100 / circulatingPrevDayUSD).toFixed(2);
      asset.circulatingUSD = Number(circulatingUSD / 1e6).toFixed(2) + ' M';
      asset.circulatingPrevDayUSD = Number(circulatingPrevDayUSD / 1e6).toFixed(2) + ' M';
      asset.notificationType = +asset.ratioChange > 1 ? 'spike' : 'drop';
      asset.ratioChange = asset.ratioChange + '%';

      return asset.pegType === 'peggedUSD' &&
        circulatingPrevDayUSD > 4_200_000 &&
        (circulatingPrevDayUSD > 3 * circulatingUSD || circulatingPrevDayUSD < 0.5 * circulatingUSD);
    });

    return filteredData;
  } catch (error) {
    console.error('Error fetching stablecoin data:', error);
    return [];
  }
}

function formatTable(data: any, columns: any) {
  const headers = columns.join(' | ');
  const rows = data.map((row: any) => columns.map((col: any) => row[col]).join(' | '));
  return [headers, ...rows].join('\n');
}

fetchStablecoinData().then(filteredData => {
  if (!filteredData.length) {
    console.log('No stablecoin spikes detected');
    return;
  }
  const tableString = formatTable(filteredData, ['symbol', 'name', 'circulatingUSD', 'circulatingPrevDayUSD', 'ratioChange', 'notificationType']);
  console.log(tableString);
  sendMessage('Probable issue with stablecoin data: \n\n' + tableString, process.env.TEAM_WEBHOOK, true);
});