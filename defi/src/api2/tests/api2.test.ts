import axios from 'axios';
import { compareJSONCustom, getRandomItems } from './utils';

const v1Endpoint = 'https://api.llama.fi'
const v2Endpoint = 'https://ulysses-testing-stuffs.llama.team'
// const v2Endpoint = 'localhost:5001'

import allProtocols from "../../protocols/data";
// import allEntities from "../../protocols/entities";
import allParentProtocols from "../../protocols/parentProtocols";
import allTreasuries from "../../protocols/treasury";
import sluggify, { sluggifyString } from '../../utils/sluggify';

const getProtocolAPI = (name: string, isV2?: boolean) => `${isV2 ? v2Endpoint : v1Endpoint}/protocol/${name}`
const getTreasuryAPI = (name: string, isV2?: boolean) => `${isV2 ? v2Endpoint : v1Endpoint}/treasury/${name}`
// const getEntityAPI = (name: string, isV2?: boolean) => `${isV2 ? v2Endpoint : v1Endpoint}/entity/${name}`

const testCount = 10
const protocols = getRandomItems(allProtocols, testCount).map(sluggify)
const treasuries = getRandomItems(allTreasuries, testCount).map(p => p.name.replace(/\s+\(Treasury\)$/i, '')).map(sluggifyString)
// const entities = getRandomItems(allEntities, testCount).map(sluggify)
const parentProtocols = getRandomItems(allParentProtocols, testCount).map(sluggify)
// console.log(protocols, parentProtocols, treasuries)

jest.setTimeout(1000000);

/* describe('Protocols', () => {
  for (const protocol of protocols)
    describe('[Protocol] ' + protocol, () =>
      it('[Protocol] ' + protocol, getProtoTestFunction(protocol, getProtocolAPI)))
});

/* describe('Parent Protocols', () => {
  for (const protocol of parentProtocols)
    describe('[Protocol] ' + protocol, () =>
      it('[Parent Protocol] ' + protocol, getProtoTestFunction(protocol, getProtocolAPI)))
}); */

describe('Treasuries', () => {
  for (const protocol of treasuries)
    describe('[Protocol] ' + protocol, () =>
      it('[Treasury] ' + protocol, getProtoTestFunction(protocol, getTreasuryAPI)))
});
 */
/* describe('Entities', () => {
  for (const protocol of entities)
    it('[Entity] ' + protocol, getProtoTestFunction(protocol, getEntityAPI))
}); */

function getProtoTestFunction(protocol: any, endPointFn: Function) {
  return async () => {
    // const resV1 = await axios.get(endPointFn(protocol))
    const resV2 = await axios.get(endPointFn(protocol, true))
    // expect(resV1.status).toBe(200);
    expect(resV2.status).toBe(200);
    // compareJSONCustom(resV1.data, resV2.data);
  }
}
