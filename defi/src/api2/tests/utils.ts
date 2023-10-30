import axios from 'axios';

const v1Endpoint = 'https://api.llama.fi'
const v2Endpoint = 'https://ulysses-testing-stuffs.llama.team'
// const v2Endpoint = 'localhost:5001'
const getProtocolAPI = (name: string, isV2?: boolean) => `${isV2 ? v2Endpoint : v1Endpoint}/protocol/${name}`
const getTreasuryAPI = (name: string, isV2?: boolean) => `${isV2 ? v2Endpoint : v1Endpoint}/treasury/${name}`
const getEntityAPI = (name: string, isV2?: boolean) => `${isV2 ? v2Endpoint : v1Endpoint}/entity/${name}`

const fnMap: any = {
  protocol: getProtocolAPI,
  treasury: getTreasuryAPI,
  entity: getEntityAPI
}

export function getRandomItems(array: any[], count: number) {
  const shuffled = array.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

export function getTests(items: any[], fnKey: string, title: string) {
  const testCount = 10
  jest.setTimeout(1000000);
  for (const protocol of getRandomItems(items, testCount))
    describe(title + ' ' + protocol, () =>
      test.concurrent('Test', getProtoTestFunction(protocol, fnKey)))
}

export function getProtoTestFunction(protocol: any, fnKey: string) {
  return async () => {
    // const resV1 = await axios.get(endPointFn(protocol))
    const resV2 = await axios.get(fnMap[fnKey](protocol, true))
    // expect(resV1.status).toBe(200);
    expect(resV2.status).toBe(200);
    // compareJSONCustom(resV1.data, resV2.data);
  }
}


export function compareJSONCustom(actual: any, expected: any) {


  actual.chains.sort()
  expected.chains.sort()

  // compareJSONNumberish(actual.currentChainTvls, expected.currentChainTvls)
  compareJSONNumberish(actual.mcap, expected.mcap)
  reduceProtoResponse(actual)
  reduceProtoResponse(expected)

  expect(actual).toEqual(expected)

  function closishNumbers(a: number, b: number, range: number = 0.2) {
    if (typeof actual !== 'number' || typeof expected !== 'number') return expect(actual).toEqual(expected)
    expect(Math.abs(a - b) / Math.max(a, b)).toBeLessThan(range)
  }

  function compareJSONArray(actual: any, expected: any) {
    closishNumbers(actual.length, expected.length, 0.05)
    const lastActual = actual.pop()
    const lastExpected = expected.pop()

    compareJSONNumberish(lastActual, lastExpected)
    expect(actual).toEqual(expected)

    for (let i = 0; i < actual.length; i++) {
      compareJSONCustom(actual[i], expected[i])
    }
  }

  function compareJSONNumberish(actual: any, expected: any) {
    Object.keys(actual).forEach((key: string) => {
      if (typeof actual[key] === 'number')
        return closishNumbers(actual[key], expected[key])
      return expect(actual[key]).toEqual(expected[key])
    })
  }

  function reduceProtoResponse(obj: any) {
    delete obj.chainTvls
    delete obj.tvl
    delete obj.tokensInUsd
    delete obj.tokens
    delete obj.currentChainTvls
    delete obj.mcap
  }
}
