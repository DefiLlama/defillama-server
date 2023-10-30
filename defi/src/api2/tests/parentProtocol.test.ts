import { getProtoTestFunction, getRandomItems } from './utils';


import allItems from "../../protocols/parentProtocols";
import sluggify from '../../utils/sluggify';

const testCount = 10
const items = getRandomItems(allItems, testCount).map(sluggify)

jest.setTimeout(1000000);
describe('Parent Protocols', () => {
  for (const protocol of items)
    it('[Parent Protocol] ' + protocol, getProtoTestFunction(protocol, 'protocol'))
});