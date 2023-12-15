import axios from 'axios';

const v1Endpoint = 'https://api.llama.fi'
const v2Endpoint = process.env.API_URL || 'http://127.0.0.1:5001'
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
  items = getRandomItems(items, testCount)
  items.forEach((protocol: any) => {
    describe(title + ' ' + protocol, () =>
      test.concurrent(protocol, getProtoTestFunction(protocol, fnKey)))
  })
}

export function getProtoTestFunction(protocol: any, fnKey: string) {
  return async () => {

    const resV1 = await axios.get(fnMap[fnKey](protocol))
    const resV2 = await axios.get(fnMap[fnKey](protocol, true))
    expect(resV1.status).toBe(200);
    expect(resV2.status).toBe(200);
    const data = resV2.data
    expect(data).toHaveProperty('chains')
    expect(data).toHaveProperty('id')
    expect(data).toHaveProperty('name')
    compareJSONCustom(resV1.data, resV2.data)
  }
}


export function compareJSONCustom(actual: any, expected: any) {


  actual.chains.sort()
  expected.chains.sort()

  compareJSONNumberish(actual.currentChainTvls, expected.currentChainTvls)
  compareJSONNumberish(actual.mcap, expected.mcap)

  if (expected.tvl.length < actual.tvl.length) closishNumbers(actual.tvl.length, expected.tvl.length, 0.05)
  if (expected.tokensInUsd.length < actual.tokensInUsd.length) closishNumbers(actual.tokensInUsd.length, expected.tokensInUsd.length, 0.05)
  if (expected.tokens.length < actual.tokens.length) closishNumbers(actual.tokens.length, expected.tokens.length, 0.05)

  reduceProtoResponse(actual)
  reduceProtoResponse(expected)

  expect(actual).toEqual(expected)

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


  function reduceProtoResponse(obj: any) {
    delete obj.chainTvls
    delete obj.tvl
    delete obj.tokensInUsd
    delete obj.tokens
    delete obj.currentChainTvls
    delete obj.mcap
    delete obj.deadFrom
    if (!(Array.isArray(obj.hallmarks) && obj.hallmarks.length > 0)) delete obj.hallmarks
  }
}

function compareJSONNumberish(actual: any, expected: any) {
  Object.keys(actual ?? {}).forEach((key: string) => {
    if (typeof actual[key] === 'number')
      return closishNumbers(actual[key], expected[key])
    return expect(actual[key]).toEqual(expected[key])
  })
}

function closishNumbers(a: number, b: number, range: number = 0.2) {
  if (typeof a !== 'number' || typeof a !== 'number') return expect(a).toEqual(b)
  expect(Math.abs(a - b) / (Math.max(a, b) || 1)).toBeLessThan(range)
}