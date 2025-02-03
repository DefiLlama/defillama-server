import axios from "axios";

// Chain configuration
const CHAIN_ID = "1"; // Ethereum mainnet

// Protocol configuration
const PROTOCOLS = {
    curve: {
        url: `https://api.stakedao.org/api/strategies/curve/${CHAIN_ID}.json`,
        name: "curve"
    },
    balancer: {
        url: `https://api.stakedao.org/api/strategies/balancer/${CHAIN_ID}.json`,
        name: "balancer"
    },
    pendle: {
        url: `https://api.stakedao.org/api/strategies/pendle/${CHAIN_ID}.json`,
        name: "pendle"
    },
    pancakeswap: {
        url: `https://api.stakedao.org/api/strategies/pancakeswap/${CHAIN_ID}.json`,
        name: "pancakeswap"
    },
    angle: {
        url: `https://api.stakedao.org/api/strategies/angle/${CHAIN_ID}.json`,
        name: "angle"
    }
} as const;

type Protocol = keyof typeof PROTOCOLS;

// Types for API responses
interface Strategy {
    vault: string;
    name: string;
    protocol: Protocol;
    lpPriceInUsd?: number;
    price?: number;
    symbol?: string; // Some protocols might provide their own symbol
}

interface ApiResponse {
    deployed: Strategy[];
}

// Function to fetch data from the StakeDAO API for a specific protocol
async function fetchStakeDaoData(protocol: Protocol): Promise<Strategy[]> {
    try {
        const { url } = PROTOCOLS[protocol];
        const response = await axios.get<ApiResponse>(url);
        console.log(`Data retrieved from StakeDAO ${protocol} API`);

        if (!response.data?.deployed) {
            throw new Error(`Invalid response format from ${protocol} API`);
        }

        const strategies = response.data.deployed;
        if (strategies.length === 0) {
            console.log(`No deployed ${protocol} strategies available.`);
        }

        return strategies;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error fetching ${protocol} data from StakeDAO:`, errorMessage);
        return [];
    }
}

// Function to format a strategy into a format suitable for DefiLlama
function formatStrategy(strategy: Strategy, timestamp: number) {
    // Get the price based on protocol
    let price: number | undefined;
    switch (strategy.protocol) {
        case 'balancer':
        case 'pancakeswap':
        case 'angle':
            price = strategy.lpPriceInUsd;
            break;
        case 'pendle':
            // Pendle might use a different price field, fallback to lpPriceInUsd if needed
            price = strategy.price || strategy.lpPriceInUsd;
            break;
        default: // curve and others
            price = strategy.lpPriceInUsd || strategy.price;
    }

    if (typeof price !== 'number' || isNaN(price) || price <= 0) {
        console.warn(`Invalid price for ${strategy.protocol} strategy ${strategy.name}: ${price}`);
        return null;
    }

    // Use provided symbol or generate one
    const symbol = strategy.symbol || `${strategy.name}-${strategy.protocol}`;

    return {
        PK: `asset#${strategy.vault}`,
        SK: timestamp,
        adapter: 'stakeDao',
        confidence: 0.95,
        decimals: 18,
        price,
        symbol
    };
}

// Main function to be called by DefiLlama
export async function getTokenPrices(timestamp: number) {
    console.log("Calling getTokenPrices with timestamp:", timestamp);
    
    // Fetch data from all protocols concurrently
    const protocolResults = await Promise.all(
        Object.keys(PROTOCOLS).map(protocol => 
            fetchStakeDaoData(protocol as Protocol)
        )
    );

    // Combine all strategies
    const allStrategies = protocolResults.flat();
    
    if (allStrategies.length === 0) {
        console.log("No strategies retrieved from StakeDAO.");
        return [];
    }

    // Format strategies and filter out invalid ones
    const writes = allStrategies
        .map(strategy => formatStrategy(strategy, timestamp))
        .filter((item): item is NonNullable<typeof item> => item !== null);

    console.log(`Successfully formatted ${writes.length} strategies for DefiLlama`);
    return writes;
}

// To test locally, run the script directly
if (require.main === module) {
    const exampleTimestamp = Math.floor(Date.now() / 1000);
    getTokenPrices(exampleTimestamp)
        .then((writes) => {
            console.log("Formatted data for DefiLlama:");
            console.log(writes);
        })
        .catch((err) => {
            console.error("Error executing getTokenPrices:", err);
        });
}
