import { getTests } from './utils';


import allItems from "../../protocols/data";
import sluggify from '../../utils/sluggify';

getTests(allItems.map(sluggify), 'protocol', `[Protocol]`)