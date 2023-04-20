# DefiLlama Coins Adapters 

## How to list a new protocol or coin

1. Fork this repository
2. Create a new folder within one of the protocol category folders in [coins/src/adapters/], with your protocol name. Eg, if you wanted to add an adapter for a yield aggregator called 'yieldAgg', you'd create a folder with the path [coins/src/adapters/yieldAgg/]. 
3. Write an adaptor for your protocol (tutorial below), titled [index.ts]
4. Test your adaptor by logging the output of your getTokenPrices() function in the adapter file, and running `ts-node <PATH TO ADAPTER>` (remember to install dependencies with `npm i` first!)
5. If the DB writes look as expected, submit a PR!

## Adapter Exports

An adapter is just a javascript file that exports an async function that returns an array of database writes, describing the state of a protocol's coins at a given timestamp. Coins follow the following schema (all values are just examples):

```js
{
    PK: "asset#ethereum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // unique identifier showing the chain and address of the token
    SK: 0, // 10 digit unix timestamp, or 0 for current timestamp
    price: 1.45632, 
    adapter: 'aave', // unique adapters identifier, used for tracability inside the database 
    symbol: "USDT", // symbol of the token
    confidence: 0.7, // number 0-1 desribing the reliablility of the price data (more information below) 
    redirect: 'coingecko#ethereum', // some coins will in theory always have the same price as another token in the DB. In this case a 'redirect' can be used instead of a 'price'. This will usually be undefined
    decimals: 18, // the number of a decimals that a token has      
  };
```

Some notes:

1. The PK may look complicated, but this can be formed for you using the addToDBWritesList() function.
2. All adapters must make a timestamp as input, therefore no effort is required to export timestamp.
3. In some cases confidence scores can be hardcoded as a value depending on the reliability of a protocol. In other cases (eg where prices are determined by pool weights in uniswap V2) confidence scores should be:

'a value between 0 and 1, proportional to the cost of manipulating the token's price'

4. The coins database only supports redirects to a depth of 1. Therefore any redirects are likely to point to a 'coingecko#...' entry.

## Adapter Walkthrough

In this section we'll walk through the Euler money market adapter with the goal of learning to write an adapter for a protocol of our choice.

# File structure

In [/coins/src/adapters/moneyMarkets/] there is a 'euler' folder. This contains all the adapter code specific to Euler.

1. [abi.json] contains any ABIs for onchain function calls.
2. [index.ts] where adapter parameters are given, for entering coin data to the database. 
3. [euler.ts] the bulk of the adapter code, where third party data is used to find token price etc.

We can see that [index.ts] exports a function with the same name as the protocol. This function runs getTokenPrices() from [euler.ts]. 

getTokenPrices() uses a variety of functions and libraries to find token prices:

1. Axios is used in fetchFromIpfs(), to fetch market information from IPFS by a REST get call. API calls don't necessarily have to be to IPFS, however we do prefer on-chain data to protocol APIs. Especially for numerical data used to calculate price. 
2. The getBlock() utility is used to find the block height of the given chain at the the given timestamp. It is worth checking the utils folder for any functions you need that may have already been written. 
3. getTokenAndRedirectData() fetches information from the DefiLlama coins database, about coins deposited to the Euler markets.
4. multiCall()is a function from the DefiLlama SDK which allows us to fetch on-chain data from many functions at once. There are lots of examples on how to use the DefiLlama SDK in the DefiLlama/DefiLlama-Adapters repo.

The last part of the adapter code to run is formWrites(). This function is used to create the array returned by the adapter. At this stage of the adapter it is crucial to handle any errors effectively so that faulty data doesnt enter the database. Notice on lines 57 and 64 where unexpected data is excluded from the writes list by returning from the map function. 

To test the Euler adapter, we can run 'ts-node coins/src/test.ts euler'. If the command successfully logs an array of database writes containing expected data, we're ready to make a PR!