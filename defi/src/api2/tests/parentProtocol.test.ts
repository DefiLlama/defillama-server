import allItems from "../../protocols/parentProtocols";
import sluggify from '../../utils/sluggify';
import { getTests } from './utils';

getTests(allItems.map((i: any) => sluggify(i)), 'protocol', `[Parent Protocol]`)