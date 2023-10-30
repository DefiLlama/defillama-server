import allItems from "../../protocols/entities";
import sluggify from '../../utils/sluggify';
import { getTests } from './utils';

getTests(allItems.map((i: any) => sluggify(i)), 'entity', `[Entity]`)