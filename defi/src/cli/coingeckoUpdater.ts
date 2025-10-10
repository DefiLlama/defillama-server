import fs from 'fs';
import path from 'path';

const DATA_FILE = 'data4';

const COINGECKO_API_KEY = undefined;

interface Protocol {
  id: string;
  name: string;
  address: string | null;
  symbol: string;
  url: string;
  description: string;
  chain: string;
  logo: string | null;
  audits: string | null;
  audit_note: string | null;
  gecko_id: string | null;
  cmcId: string | null;
  category: string;
  chains: string[];
  oracles: string[];
  forkedFrom: string[];
  module: string;
  twitter: string;
  audit_links?: string[];
  parentProtocol?: string;
}

// Keep track of used gecko_ids to avoid duplicates
const usedGeckoIds = new Set<string>();

// Add the excluded categories constant
const EXCLUDED_CATEGORIES = [
  'Stablecoins',
  'Stablecoin',
  'Liquid Staking Tokens',
  'Restaking'
] as const;

async function searchCoingecko(tokenSymbol: string): Promise<any[]> {
  try {
    const url = `https://pro-api.coingecko.com/api/v3/search?query=${tokenSymbol}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'x-cg-pro-api-key': COINGECKO_API_KEY || ''
      }
    });
    const json = await response.json();
    return json.coins.filter((coin: any) =>
      coin.symbol.toLowerCase() === tokenSymbol.toLowerCase()
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
        'x-cg-pro-api-key': COINGECKO_API_KEY || ''
      }
    });
    const data = await response.json();

    console.log(`\nChecking details for coin ${coinId}:`);
    console.log('- Categories:', data.categories || 'none');
    console.log('- Has market price:', !!data.market_data?.current_price);
    console.log('- CG Twitter:', data.links?.twitter_screen_name);
    console.log('- Protocol Twitter:', twitterHandle);
    console.log('- CG Homepage:', data.links?.homepage?.[0]);

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
  if (!COINGECKO_API_KEY) {
    console.error('Error: COINGECKO_API_KEY variable is required');
    return;
  }
  
  console.log('Loading protocols data...');

  let protocols: Protocol[];
  try {
    // Import the data directly
    protocols = require(`../protocols/${DATA_FILE}`).default;
    console.log('Successfully loaded protocols:', protocols.length);
  } catch (error) {
    console.error('Failed to load protocols data:', error);
    return;
  }

  // Track updates for final report
  const updatedProtocols: { name: string; twitter: string; gecko_id: string }[] = [];

  // Collect existing gecko_ids
  protocols.forEach((protocol) => {
    if (protocol.gecko_id) {
      usedGeckoIds.add(protocol.gecko_id);
    }
  });

  console.log(`Processing ${protocols.length} protocols...\n`);

  // Process each protocol
  for (const protocol of protocols) {
    if (
      protocol.gecko_id ||
      !protocol.twitter ||
      !protocol.symbol ||
      protocol.symbol === '-' ||
      protocol.parentProtocol
    ) {
      continue;
    }

    console.log(`Processing ${protocol.name} (${protocol.symbol})`);

    // Search for matching coins
    const matchingCoins = await searchCoingecko(protocol.symbol);

    if (matchingCoins.length === 0) {
      console.log(`No matches found for ${protocol.name} (${protocol.symbol})\n`);
      continue;
    }

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
        usedGeckoIds.add(coingeckoId);
        updatedProtocols.push({
          name: protocol.name,
          twitter: protocol.twitter,
          gecko_id: coingeckoId
        });
        console.log(`Found gecko_id ${coingeckoId} for ${protocol.name}\n`);
        foundMatch = true;
        break;
      }
    }

    if (!foundMatch) {
      console.log(`No matching gecko_id found for ${protocol.name}\n`);
    }

    // Add delay to respect rate limits
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  // Write results to a new file
  const outputPath = path.join(__dirname, 'temp', `${DATA_FILE}_new_gecko_id.json`);
  const outputData = {
    timestamp: new Date().toISOString(),
    totalFound: updatedProtocols.length,
    protocols: updatedProtocols
  };

  try {
    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
    console.log(`\n=== Results Summary ===`);
    console.log(`Found ${updatedProtocols.length} new gecko_ids`);
    console.log(`Results written to: ${outputPath}`);
    if (updatedProtocols.length > 0) {
      console.log('\nFound gecko_ids:');
      updatedProtocols.forEach((p) => {
        console.log(`- ${p.name} (@${p.twitter}): ${p.gecko_id}`);
      });
    }
    console.log('=====================\n');
  } catch (error) {
    console.error('Error writing output file:', error);
  }
}

updateProtocolsData().catch(console.error);
