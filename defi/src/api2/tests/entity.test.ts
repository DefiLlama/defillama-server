import { getProtoTestFunction, getRandomItems } from './utils';


import allItems from "../../protocols/entities";
import sluggify from '../../utils/sluggify';

const testCount = 10
const items = getRandomItems(allItems, testCount).map(sluggify)

jest.setTimeout(1000000);
describe('Entities', () => {
  for (const protocol of items)
    it('[Entity] ' + protocol, getProtoTestFunction(protocol, 'entity'))
});