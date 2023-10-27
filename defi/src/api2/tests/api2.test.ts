import axios from 'axios';
const v1Endpoint = 'https://api.llama.fi'
const v2Endpoint = 'http://localhost:5001'

const getProtocolAPI = (name: string, isV2?: boolean) => `${isV2 ? v2Endpoint : v1Endpoint}/protocol/${name}`
const protocols = ['ociswap', 'aave', 'defisaver', 'yearn-finance', 'starfish-finance']

jest.setTimeout(1000000);
describe('JSON Responses Comparison', () => {
  for (const protocol of protocols) {
    it( protocol +': should have the same JSON response', async () => {
      const { resV1, resV2 } = await getProtocolData(protocol);
      // Perform the comparison of the JSON responses
      expect(resV1.status).toBe(200); // Check if the response status is OK
      expect(resV2.status).toBe(200);
      printT(protocol, 'tvl', resV1, resV2)
      printT(protocol, 'tokensInUsd', resV1, resV2)
      printT(protocol, 'tokens', resV1, resV2)
      // Compare the JSON data
      reduceProtoResponse(resV1.data)
      reduceProtoResponse(resV2.data)
      expect(resV1.data).toEqual(resV2.data);
    })
  }
});

async function getProtocolData(protocol: string) {
  const [resV1, resV2] = await Promise.all([
    axios.get(getProtocolAPI(protocol)),
    axios.get(getProtocolAPI(protocol, true)),
  ]);
  return { resV1, resV2 };
}

function reduceProtoResponse(obj: any) {
  delete obj.chainTvls
  delete obj.tvl
  delete obj.tokensInUsd
  delete obj.tokens
  delete obj.currentChainTvls
}

function printT(proto: string, key: string, r1: any, r2: any) {
  console.log(proto, key, r1.data[key]?.length, r2.data[key]?.length)

}