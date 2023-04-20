import { importAdapter } from "../utils/imports/importAdapter";
import protocols from "../protocols/data"

const main = async () => {
    let misrepresented = 0
    for (const protocol of protocols) {
        const adapter = await importAdapter(protocol);
        if (adapter.misrepresentedTokens === true) {
            misrepresented++;
        }
    }
    console.log(misrepresented, protocols.length, 100 * misrepresented / protocols.length)
};
main();