import { getProtoTestFunction, getRandomItems } from './utils';


import allItems from "../../protocols/data";
import sluggify from '../../utils/sluggify';

const testCount = 10
const items = getRandomItems(allItems, testCount).map(sluggify)

jest.setTimeout(1000000);
describe('Protocols', () => {
  for (const protocol of items)
    it('[Protocol] ' + protocol, getProtoTestFunction(protocol, 'protocol'))
});