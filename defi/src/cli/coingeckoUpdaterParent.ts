import fs from 'fs';
import path from 'path';
import { IParentProtocol } from '../protocols/types';

// Keep track of used gecko_ids to avoid duplicates
const usedGeckoIds = new Set<string>();

// Add at the top with other constants
const EXCLUDED_CATEGORIES = [
  'Stablecoins',
  'Stablecoin',
  'Liquid Staking Tokens',
  'Restaking'
] as const;

async function searchCoingecko(protocolName: string): Promise<any[]> {
  try {
    // Clean the protocol name - remove common suffixes and special characters
    const cleanName = protocolName
      .replace(/(Protocol|Finance|Exchange|DAO|Network|Foundation)$/i, '')
      .trim()
      .toLowerCase();

    const url = `https://pro-api.coingecko.com/api/v3/search?query=${encodeURIComponent(cleanName)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'x-cg-pro-api-key': process.env.CG_API_KEY!
      }
    });
    const json = await response.json();

    // Filter coins whose name contains our cleaned protocol name
    return json.coins.filter((coin: any) =>
      coin.name.toLowerCase().includes(cleanName) ||
      coin.id.toLowerCase().includes(cleanName)
    );
  } catch (error) {
    console.error('Error in searchCoingecko:', error);
    return [];
  }
}

async function fetchCoinDetails(
  coinId: string,
  twitterHandle: string,
  homepage: string
): Promise<string | undefined> {
  try {
    const url = `https://pro-api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=true&market_data=true&community_data=false&developer_data=false&sparkline=false`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'x-cg-pro-api-key': process.env.CG_API_KEY!
      }
    });
    const data = await response.json();

    console.log(`\nChecking details for coin ${coinId}:`);
    console.log('- Categories:', data.categories || 'none');
    console.log('- Has market price:', !!data.market_data?.current_price);
    console.log('- CG Twitter:', data.links?.twitter_screen_name);
    console.log('- Protocol Twitter:', twitterHandle);
    console.log('- CG Homepage:', data.links?.homepage?.[0]);
    console.log('- Protocol Homepage:', homepage);

    // Check if protocol has any excluded categories
    const hasExcludedCategory = data.categories?.some((category: string) =>
      EXCLUDED_CATEGORIES.includes(category as any)
    );
    if (hasExcludedCategory) {
      console.log('❌ Excluded due to category');
      return undefined;
    }

    // Check if market data exists
    if (!data.market_data?.current_price) {
      console.log('❌ No market price data');
      return undefined;
    }

    // First try to match by Twitter handle
    if (
      data.links?.twitter_screen_name?.toLowerCase() ===
      twitterHandle.toLowerCase()
    ) {
      console.log('✅ Matched by Twitter handle');
      return coinId;
    }

    // If Twitter doesn't match, check if homepage matches
    if (data.links?.homepage?.[0] === homepage) {
      console.log('✅ Matched by homepage URL');
      return coinId;
    }

    console.log('❌ No matches found');
    return undefined;
  } catch (error) {
    console.error(`Error fetching details for ${coinId}:`, error);
    return undefined;
  }
}

async function updateProtocolsData() {
  const parentPath = path.join(__dirname, '../protocols', 'parentProtocols.ts');
  console.log('Working with parent protocols file:', parentPath);

  const parentContent = fs.readFileSync(parentPath, 'utf8');
  const parentMatch = parentContent.match(
    /const parentProtocols: IParentProtocol\[\] = (\[[\s\S]*?\]);/
  );
  if (!parentMatch) {
    console.error('Could not find parent protocols data in file');
    return;
  }

  // Import baseIconsUrl from the constants file
  const { baseIconsUrl } = require('../constants');

  let parentProtocols: IParentProtocol[];
  try {
    const code = `
      const baseIconsUrl = "${baseIconsUrl}";
      return ${parentMatch[1]};
    `;
    const fn = new Function(code);
    parentProtocols = fn();
    console.log('Successfully parsed parent protocols:', parentProtocols.length);
  } catch (error) {
    console.error('Failed to parse parent protocols data:', error);
    return;
  }

  // Track updates for final report
  const updatedProtocols: { name: string; gecko_id: string }[] = [];

  // Process each parent protocol
  for (const protocol of parentProtocols) {
    if (protocol.gecko_id || !protocol.twitter) {
      continue;
    }

    console.log(`Processing parent protocol ${protocol.name}`);

    // Search for matching coins by protocol name
    const matchingCoins = await searchCoingecko(protocol.name);

    if (matchingCoins.length === 0) {
      console.log(`No matches found for ${protocol.name}\n`);
      continue;
    }

    console.log(`Found ${matchingCoins.length} potential matches for ${protocol.name}`);

    // Check each matching coin
    let foundMatch = false;
    for (const coin of matchingCoins) {
      if (usedGeckoIds.has(coin.id)) {
        continue;
      }

      const coingeckoId = await fetchCoinDetails(
        coin.id,
        protocol.twitter,
        protocol.url
      );
      if (coingeckoId) {
        protocol.gecko_id = coingeckoId;
        usedGeckoIds.add(coingeckoId);

        updatedProtocols.push({
          name: protocol.name,
          gecko_id: coingeckoId
        });
        console.log(`Added gecko_id ${coingeckoId} to ${protocol.name}\n`);
        foundMatch = true;
        break;
      }
    }

    if (!foundMatch) {
      console.log(`No matching gecko_id found for ${protocol.name}\n`);
    }

    // Add delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 250));
  }

  console.log('\n=== Update Summary ===');
  if (updatedProtocols.length === 0) {
    console.log('No protocols were updated with new gecko_ids');
  } else {
    console.log('The following parent protocols were updated with gecko_ids:');
    updatedProtocols.forEach(p => {
      console.log(`- ${p.name}: ${p.gecko_id}`);
    });
  }
  console.log('===================\n');
}

updateProtocolsData().catch(console.error);
