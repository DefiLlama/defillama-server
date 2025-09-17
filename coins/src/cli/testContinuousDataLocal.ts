import { getCurrentUnixTimestamp } from "../utils/date";

interface HistoricalResponse {
  coins: {
    [coin: string]: {
      decimals?: number;
      price: number;
      timestamp: number;
      symbol: string;
      confidence?: number;
    };
  };
}

interface TestResult {
  coin: string;
  requestedTimestamp: number;
  apiTimestamp?: number;
  timeDifference?: number;
  hasData: boolean;
  price?: number;
  symbol?: string;
}

// Popular coins that are likely to have continuous data
const POPULAR_COINS = [
  "ethereum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // USDC
  "ethereum:0xdAC17F958D2ee523a2206206994597C13D831ec7", // USDT
  "ethereum:0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // WBTC
  "ethereum:0x6B175474E89094C44Da98b954EedeAC495271d0F", // DAI
  "ethereum:0x514910771AF9Ca656af840dff83E8264EcF986CA", // LINK
  "ethereum:0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", // UNI
  "ethereum:0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9", // AAVE
  "ethereum:0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2", // MKR
  "ethereum:0x6B3595068778DD592e39A122f4f5a5cF09C90fE2", // SUSHI
  "ethereum:0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e", // YFI
  "coingecko:bitcoin",
  "coingecko:ethereum",
  "coingecko:binancecoin",
  "coingecko:cardano",
  "coingecko:solana",
  "coingecko:polkadot",
  "coingecko:dogecoin",
  "coingecko:avalanche-2",
  "coingecko:matic-network",
  "coingecko:chainlink"
];

function getRandomCoins(coins: string[], count: number): string[] {
  const shuffled = [...coins].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function generateTimestamps(): number[] {
  const now = getCurrentUnixTimestamp();
  const twelveHoursAgo = now - (12 * 60 * 60); // 12 hours in seconds
  const timestamps: number[] = [];
  
  // Generate timestamps every 5 minutes
  for (let timestamp = twelveHoursAgo; timestamp <= now; timestamp += 5 * 60) {
    timestamps.push(timestamp);
  }
  
  console.log(`Generated ${timestamps.length} timestamps from ${new Date(twelveHoursAgo * 1000)} to ${new Date(now * 1000)}`);
  return timestamps;
}

async function queryHistoricalPrices(coins: string[], timestamp: number): Promise<HistoricalResponse> {
  const coinsParam = coins.join(',');
  const url = `https://coins.llama.fi/prices/historical/${timestamp}/${coinsParam}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error querying ${url}:`, error);
    throw error;
  }
}

async function testContinuousData(): Promise<void> {
  console.log("Starting continuous data test (local version)...");
  
  // Use predefined popular coins
  const selectedCoins = getRandomCoins(POPULAR_COINS, 20);
  console.log(`Selected ${selectedCoins.length} popular coins for testing`);
  console.log("Coins:", selectedCoins);
  
  // Generate timestamps for the last 12 hours (every 5 minutes)
  const timestamps = generateTimestamps();
  
  const results: TestResult[] = [];
  
  // Test each timestamp
  for (let i = 0; i < timestamps.length; i++) {
    const timestamp = timestamps[i];
    console.log(`Testing timestamp ${i + 1}/${timestamps.length}: ${new Date(timestamp * 1000).toISOString()}`);
    
    try {
      const response = await queryHistoricalPrices(selectedCoins, timestamp);
      
      // Process results for each coin
      selectedCoins.forEach(coin => {
        const coinData = response.coins[coin];
        const result: TestResult = {
          coin,
          requestedTimestamp: timestamp,
          hasData: !!coinData,
        };
        
        if (coinData) {
          result.apiTimestamp = coinData.timestamp;
          result.timeDifference = Math.abs(coinData.timestamp - timestamp);
          result.price = coinData.price;
          result.symbol = coinData.symbol;
        }
        
        results.push(result);
      });
      
      // Add a small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`Failed to query timestamp ${timestamp}:`, error);
      
      // Add failed results
      selectedCoins.forEach(coin => {
        results.push({
          coin,
          requestedTimestamp: timestamp,
          hasData: false,
        });
      });
    }
  }
  
  // Analyze results
  console.log("\n=== TEST RESULTS ===");
  
  const totalQueries = results.length;
  const successfulQueries = results.filter(r => r.hasData).length;
  const failedQueries = totalQueries - successfulQueries;
  
  console.log(`Total queries: ${totalQueries}`);
  console.log(`Successful queries: ${successfulQueries} (${((successfulQueries / totalQueries) * 100).toFixed(2)}%)`);
  console.log(`Failed queries: ${failedQueries} (${((failedQueries / totalQueries) * 100).toFixed(2)}%)`);
  
  // Analyze time differences
  const timeDifferences = results.filter(r => r.timeDifference !== undefined).map(r => r.timeDifference!);
  const successfulResults = results.filter(r => r.hasData && r.timeDifference !== undefined);
  
  if (timeDifferences.length > 0) {
    const avgTimeDiff = timeDifferences.reduce((a, b) => a + b, 0) / timeDifferences.length;
    const maxTimeDiff = Math.max(...timeDifferences);
    const minTimeDiff = Math.min(...timeDifferences);
    
    console.log(`\nTime difference analysis:`);
    console.log(`Average time difference: ${avgTimeDiff.toFixed(2)} seconds`);
    console.log(`Maximum time difference: ${maxTimeDiff} seconds`);
    console.log(`Minimum time difference: ${minTimeDiff} seconds`);
    
    // Count queries with large time differences (> 5 minutes)
    const largeTimeDiffs = timeDifferences.filter(diff => diff > 300);
    console.log(`Queries with >5min time difference: ${largeTimeDiffs.length} (${((largeTimeDiffs.length / timeDifferences.length) * 100).toFixed(2)}%)`);
    
    // Count queries with >2min time differences
    const twoMinTimeDiffs = timeDifferences.filter(diff => diff > 120);
    console.log(`Queries with >2min time difference: ${twoMinTimeDiffs.length} (${((twoMinTimeDiffs.length / timeDifferences.length) * 100).toFixed(2)}%)`);
  }
  
  // Breakdown by token of queries with >2min time differences
  if (successfulResults.length > 0) {
    const tokenBreakdown = new Map<string, { count: number; total: number; symbol?: string }>();
    
    successfulResults.forEach(result => {
      const isOverTwoMin = (result.timeDifference || 0) > 300;
      const key = result.coin;
      
      if (!tokenBreakdown.has(key)) {
        tokenBreakdown.set(key, { count: 0, total: 0, symbol: result.symbol });
      }
      
      const entry = tokenBreakdown.get(key)!;
      entry.total++;
      if (isOverTwoMin) {
        entry.count++;
      }
    });
    
    // Sort by percentage of >2min differences (descending)
    const sortedBreakdown = Array.from(tokenBreakdown.entries())
      .map(([coin, data]) => ({
        coin,
        symbol: data.symbol,
        count: data.count,
        total: data.total,
        percentage: (data.count / data.total) * 100
      }))
      .filter(item => item.count > 0) // Only show tokens with >2min differences
      .sort((a, b) => b.percentage - a.percentage);
    
    if (sortedBreakdown.length > 0) {
      console.log(`\nBreakdown by token of queries with >2min time differences:`);
      sortedBreakdown.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.coin} (${item.symbol}): ${item.count}/${item.total} queries (${item.percentage.toFixed(2)}%)`);
      });
    } else {
      console.log(`\nNo tokens had queries with >2min time differences.`);
    }
  }
  
  // Display maximum time difference by token
  if (successfulResults.length > 0) {
    const maxTimeDiffByToken = new Map<string, { maxDiff: number; symbol?: string; requestedTime?: number; apiTime?: number }>();
    
    successfulResults.forEach(result => {
      const key = result.coin;
      const timeDiff = result.timeDifference || 0;
      
      if (!maxTimeDiffByToken.has(key) || timeDiff > maxTimeDiffByToken.get(key)!.maxDiff) {
        maxTimeDiffByToken.set(key, {
          maxDiff: timeDiff,
          symbol: result.symbol,
          requestedTime: result.requestedTimestamp,
          apiTime: result.apiTimestamp
        });
      }
    });
    
    // Sort by maximum time difference (descending)
    const sortedMaxDiffs = Array.from(maxTimeDiffByToken.entries())
      .map(([coin, data]) => ({
        coin,
        symbol: data.symbol,
        maxDiff: data.maxDiff,
        requestedTime: data.requestedTime,
        apiTime: data.apiTime
      }))
      .sort((a, b) => b.maxDiff - a.maxDiff);
    
    console.log(`\nMaximum time difference by token:`);
    sortedMaxDiffs.forEach((item, index) => {
      const requestedTimeStr = item.requestedTime ? new Date(item.requestedTime * 1000).toISOString() : 'N/A';
      const apiTimeStr = item.apiTime ? new Date(item.apiTime * 1000).toISOString() : 'N/A';
      console.log(`  ${index + 1}. ${item.coin} (${item.symbol}): ${item.maxDiff}s`);
      console.log(`     Requested: ${requestedTimeStr}`);
      console.log(`     API returned: ${apiTimeStr}`);
    });
  }
  
  // Show some examples of failed queries
  const failedResults = results.filter(r => !r.hasData);
  if (failedResults.length > 0) {
    console.log(`\nExamples of failed queries:`);
    const uniqueFailedCoins = [...new Set(failedResults.map(r => r.coin))];
    uniqueFailedCoins.slice(0, 10).forEach(coin => {
      const coinFailures = failedResults.filter(r => r.coin === coin);
      console.log(`  ${coin}: ${coinFailures.length} failures`);
    });
  }
  
  // Show some examples of successful queries with their time differences
  if (successfulResults.length > 0) {
    console.log(`\nExamples of successful queries:`);
    const sortedByTimeDiff = successfulResults.sort((a, b) => (b.timeDifference || 0) - (a.timeDifference || 0));
    sortedByTimeDiff.slice(0, 10).forEach(result => {
      console.log(`  ${result.coin} (${result.symbol}): ${result.timeDifference}s diff, price: $${result.price}`);
    });
    
    // Show top 3 maximum time differences with timestamps
    console.log(`\nTop 3 maximum time differences:`);
    sortedByTimeDiff.slice(0, 3).forEach((result, index) => {
      const requestedTime = new Date(result.requestedTimestamp * 1000).toISOString();
      const apiTime = new Date(result.apiTimestamp! * 1000).toISOString();
      console.log(`  ${index + 1}. ${result.coin} (${result.symbol}):`);
      console.log(`     Requested: ${requestedTime}`);
      console.log(`     API returned: ${apiTime}`);
      console.log(`     Time difference: ${result.timeDifference}s`);
      console.log(`     Price: $${result.price}`);
    });
  }
}

// Run the test
if (require.main === module) {
  testContinuousData()
    .then(() => {
      console.log("\nTest completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Test failed:", error);
      process.exit(1);
    });
}

export default testContinuousData;
