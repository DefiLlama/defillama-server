import axios from 'axios';
import { getRandomItems } from './utils';

const v1Endpoint = 'https://api.llama.fi'
const v2Endpoint = 'https://ulysses-testing-stuffs.llama.team'
// const v2Endpoint = 'localhost:5001'

import allProtocols from "../../protocols/data";
// import allEntities from "../../protocols/entities";
import allParentProtocols from "../../protocols/parentProtocols";
import allTreasuries from "../../protocols/treasury";


const getProtocolAPI = (name: string, isV2?: boolean) => `${isV2 ? v2Endpoint : v1Endpoint}/protocol/${name}`
const getTreasuryAPI = (name: string, isV2?: boolean) => `${isV2 ? v2Endpoint : v1Endpoint}/treasury/${name}`
// const getEntityAPI = (name: string, isV2?: boolean) => `${isV2 ? v2Endpoint : v1Endpoint}/entity/${name}`

const testCount = 3
const protocols = getRandomItems(allProtocols, testCount).map(p => p.name)
const treasuries = getRandomItems(allTreasuries, testCount).map(p => p.name.replace(/\s+\(Treasury\)$/i, ''))
console.log(treasuries)
// const entities = getRandomItems(allEntities, testCount).map(p => p.name)
const parentProtocols = getRandomItems(allParentProtocols, testCount).map(p => p.name)

jest.setTimeout(1000000);

/* describe('Protocols', () => {
  for (const protocol of protocols)
    it('[Protocol] ' + protocol, getProtoTestFunction(protocol, getProtocolAPI))
});

describe('Parent Protocols', () => {
  for (const protocol of parentProtocols)
    it('[Parent Protocol] ' + protocol, getProtoTestFunction(protocol, getProtocolAPI))
}); */

describe('Treasuries', () => {
  for (const protocol of treasuries)
    it('[Treasury] ' + protocol, getProtoTestFunction(protocol, getTreasuryAPI))
});

/* describe('Entities', () => {
  for (const protocol of entities)
    it('[Entity] ' + protocol, getProtoTestFunction(protocol, getEntityAPI))
}); */

function getProtoTestFunction(protocol: any, endPointFn: Function) {
  return async () => {
    const { resV1, resV2 } = await getProtocolData(protocol, endPointFn);
    expect(resV1.status).toBe(200);
    expect(resV2.status).toBe(200);
    compareJSONCustom(resV1.data, resV2.data);
  }
}

async function getProtocolData(protocol: string, endPointFn: Function) {
  const [resV1, resV2] = await Promise.all([
    axios.get(endPointFn(protocol)),
    axios.get(endPointFn(protocol, true)),
  ]);
  return { resV1, resV2 };
}

function compareJSONCustom(actual: any, expected: any) {


  actual.chains.sort()
  expected.chains.sort()

  compareJSONNumberish(actual.currentChainTvls, expected.currentChainTvls)
  compareJSONNumberish(actual.mcap, expected.mcap)
  /* Object.keys(actual.chainTvls).forEach((key: string) => {
    Object.keys(actual.chainTvls[key]).forEach((chain: string) => compareJSONArray(actual.chainTvls[key][chain], expected.chainTvls[key][chain]))
  }) */
/*
  compareJSONArray(actual.tvl, expected.tvl)
  compareJSONArray(actual.tokensInUsd, expected.tokensInUsd)
  compareJSONArray(actual.tokens, expected.tokens)
  compareJSONNumberish(actual.currentChainTvls, expected.currentChainTvls)
 */
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
