import { getTokenPrices } from "./suzaku";

export async function suzaku(timestamp: number = 0) {
  return await getTokenPrices(timestamp);
}

// Test direct
if (require.main === module) {
  (async () => {
    console.log("Suzaku adapter result:", await suzaku());
  })();
}
