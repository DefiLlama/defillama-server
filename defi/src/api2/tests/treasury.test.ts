
import { getProtoTestFunction, getRandomItems } from './utils';
import allItems from "../../protocols/treasury";
import { sluggifyString } from '../../utils/sluggify';

const testCount = 10
const items = getRandomItems(allItems, testCount).map(sluggifyString)

jest.setTimeout(1000000);
describe('Treasuries', () => {
  for (const protocol of items)
    it('[Treasury] ' + protocol, getProtoTestFunction(protocol, 'treasury'))
});