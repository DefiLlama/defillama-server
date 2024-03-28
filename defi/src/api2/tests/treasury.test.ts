
import { sluggifyString } from '../../utils/sluggify';
import allItems from "../../protocols/treasury";
import { getTests } from './utils';

getTests(allItems.map((i: any) => sluggifyString(i.name.replace(/\s+\(Treasury\)$/i, ''))), 'treasury', `[Treasury]`)