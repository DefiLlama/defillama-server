// legacy
const deployers: { [chain: string]: string[] } = {
  polygon: [
    "0x463f64Ad3448e0bE80ba3b6428a9d029f25f162f", // canonical mapper
  ],
  arbitrum: [
    "0x1824988aF7A12c339784a171A514E20609896321", // wsteth
  ],
};
export default deployers;
