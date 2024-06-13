import getTokenPrices from "./aave";

export function aave(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices(
      "base",
      "0x2f6571d3Eb9a4e350C68C36bCD2afe39530078E2",
      "0x940F9a5d5F9ED264990D0eaee1F3DD60B4Cb9A22",
      "v3",
      timestamp
    ),
    getTokenPrices(
      "optimism",
      "0x770ef9f4fe897e59daCc474EF11238303F9552b6",
      "0x22D76094730fA377184100EFB8CEfC673B89B372",
      "v3",
      timestamp
    ),
    getTokenPrices(
      "arbitrum",
      "0x770ef9f4fe897e59daCc474EF11238303F9552b6",
      "0xD61BF98649EA8F8D09e184184777b1867F00E5CB",
      "v3",
      timestamp
    ),
    getTokenPrices(
      "ethereum",
      "0x52D306e36E3B6B02c153d0266ff0f85d18BCD413",
      null,
      "v2",
      timestamp
    ),
    getTokenPrices(
      "ethereum",
      "0xbaA999AC55EAce41CcAE355c77809e68Bb345170",
      "0x411D79b8cC43384FDE66CaBf9b6a17180c842511",
      "v3",
      timestamp
    ),
    // AMM market has no registry
    //getTokenPrices("ethereum", "0x7937d4799803fbbe595ed57278bc4ca21f3bffcb");
    getTokenPrices(
      "polygon",
      "0x3ac4e9aa29940770aeC38fe853a4bbabb2dA9C19",
      null,
      "v2",
      timestamp
    ),
    //polygon V3
    getTokenPrices(
      "polygon",
      "0x770ef9f4fe897e59daCc474EF11238303F9552b6",
      "0x397202AB0b4E7C954ac0c493c00749C517210953",
      "v3",
      timestamp
    ),
    getTokenPrices(
      "avax",
      "0x4235E22d9C3f28DCDA82b58276cb6370B01265C2",
      null,
      "v2",
      timestamp
    ),
    //avax V3
    getTokenPrices(
      "avax",
      "0x770ef9f4fe897e59daCc474EF11238303F9552b6",
      "0x691C316b2Eec7e64d17e7E3E01f3dB44c9CcEf19",
      "v3",
      timestamp
    ),
    getTokenPrices(
      "scroll",
      "0xFBedc64AeE24921cb43004312B9eF367a4162b57",
      "0x970b77b96D94966939a8F867c2BfC2aC0310C0e7",
      "v3",
      timestamp
    ),
    getTokenPrices(
      "metis",
      "0x9E7B73ffD9D2026F3ff4212c29E209E09C8A91F5",
      "0x9C62AdC332888F56998542415c38D7CDf3Ff7619",
      "v3",
      timestamp
    ),
    getTokenPrices(
      "bsc",
      "0x117684358D990E42Eb1649E7e8C4691951dc1E71",
      "0x326aB0868bD279382Be2DF5E228Cb8AF38649AB4",
      "v3",
      timestamp
    ),
    getTokenPrices(
      "gnosis",
      "0x1236010CECea55998384e795B59815D871f5f94d",
      "0x02e9b27599C4Bf8f789d34b6E65C51092c3d9FA6",
      "v3",
      timestamp
    ),
  ]);
}
export function geist(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices(
      "fantom",
      "0x4CF8E50A5ac16731FA2D8D9591E195A285eCaA82",
      null,
      "v2",
      timestamp
    ),
  ]);
}
export function radiant(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices(
      "arbitrum",
      "0x7BB843f889e3a0B307299c3B65e089bFfe9c0bE0",
      null,
      "v2",
      timestamp
    ),
    getTokenPrices(
      "arbitrum",
      "0x9D36DCe6c66E3c206526f5D7B3308fFF16c1aa5E",
      null,
      "v2",
      timestamp
    ),
  ]);
}
export function klap(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices(
      "klaytn",
      "0x969E4A05c2F3F3029048e7943274eC2E762497AB",
      null,
      "v2",
      timestamp
    ),
  ]);
}
export function valas(timestamp: number = 0) {
  return getTokenPrices(
    "bsc",
    "0x99E41A7F2Dd197187C8637D1D151Dc396261Bc14",
    null,
    "v2",
    timestamp
  );
}
export function uwulend(timestamp: number = 0) {
  return getTokenPrices(
    "ethereum",
    "0xaC538416BA7438c773F29cF58afdc542fDcABEd4",
    null,
    "v2",
    timestamp
  );
}

export const adapters = {
  aave,
  geist,
  radiant,
  uwulend,
  //klap,
  //valas,
};
