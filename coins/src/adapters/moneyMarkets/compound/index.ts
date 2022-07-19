import getTokenPrices from "./compound";

export function compound() {
  return Promise.all([
    getTokenPrices("ethereum", "0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b")
  ]);
}
