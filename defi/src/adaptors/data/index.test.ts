import { AdapterType } from '@defillama/dimension-adapters/adapters/types';
//import { writeFile } from 'fs';
//import { config } from './protocols';
import data from './index'
//import { IJSON } from './types';

describe("Protocol adaptor list is complete", () => {
    it("DEXS", () => {
        const d = data(AdapterType.DEXS).default
        expect(d).toMatchSnapshot()
    });
    it("FEES", () => {
        const d = data(AdapterType.FEES).default
        expect(d).toMatchSnapshot()
    });
    it("DERIVATIVES", () => {
        const d = data(AdapterType.DERIVATIVES).default
        expect(d).toMatchSnapshot()
    });
    it("OPTIONS", () => {
        const d = data(AdapterType.OPTIONS).default
        expect(d).toMatchSnapshot()
    });
    it("AGGREGATORS", () => {
        const d = data(AdapterType.AGGREGATORS).default
        expect(d).toMatchSnapshot()
    });
    it("INCENTIVES", () => {
        const d = data(AdapterType.INCENTIVES).default
        expect(d).toMatchSnapshot()
    });
    it("PROTOCOLS", () => {
        const d = data(AdapterType.PROTOCOLS).default
        expect(d).toMatchSnapshot()
    });
});


/* const formatted = Object.entries(config).reduce((acc, [module, config]) => {
    const findd = d.find(sm => sm.module === module)?.id
    if (!findd) throw new Error(`not found! ${module}`)
    acc[module] = {
        ...config,
        id: findd
    }
    return acc
}, {} as IJSON<any>)
writeFile(`./src/adaptors/data/${type}/new_config.ts`, `
export default
${JSON.stringify(formatted, null, 2)}

`, err => {
    if (err) {
        console.error(err);
    }
    // file written successfully
}); */