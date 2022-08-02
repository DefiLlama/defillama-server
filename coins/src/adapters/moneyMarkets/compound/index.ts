import getTokenPrices from "./compound";

export function compound(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices(
      "ethereum",
      "0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b",
      timestamp
    )
  ]);
}
export function ironbank(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices(
      "ethereum",
      "0xAB1c342C7bf5Ec5F02ADEA1c2270670bCa144CbB",
      timestamp
    )
  ]);
}
