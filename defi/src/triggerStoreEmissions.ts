import invokeLambda from "./utils/shared/invokeLambda";
import adapters from "./utils/imports/emissions_adapters";

function shuffleArray(array: [string, any][]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

const step = 40;
export default async function handler() {
  let adaptersArray = Object.entries(adapters);
  shuffleArray(adaptersArray);
  for (let i = 0; i < adaptersArray.length; i += step) {
    const event = {
      adapters: adaptersArray.slice(i, i + step),
    };
    await invokeLambda(`defillama-prod-storeEmissions`, event);
  }
}
