import invokeLambda from "./utils/shared/invokeLambda";
import adapters from "./utils/imports/emissions_adapters";

function shuffleArray(array: number[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

const step = 5;
export default async function handler() {
  let adaptersArray = Object.entries(adapters);
  const protocolIndexes: number[] = Array.from(Array(adaptersArray.length).keys());
  shuffleArray(protocolIndexes);
  for (let i = 0; i < protocolIndexes.length; i += step) {
    const event = {
      protocolIndexes: protocolIndexes.slice(i, i + step),
    };
    await invokeLambda(`defillama-prod-storeEmissions`, event);
  }
}
