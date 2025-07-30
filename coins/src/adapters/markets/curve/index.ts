import getTokenPrices2 from "./curve2";
import getGaugePrices from "./gauges";

const defaultRegistries = [
  "stableswap",
  "crypto",
  "stableFactory",
  "cryptoFactory",
];
export function curve(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices2("ethereum", ["crypto"], timestamp),
    getTokenPrices2("ethereum", [], timestamp, "eth-custom", [
      "0x7b0eff0c991f0aa880481fdfa5624cb0bc9b10e1",
      "0x326290a1b0004eee78fa6ed4f1d8f4b2523ab669",
      "0x6685fcFCe05e7502bf9f0AA03B36025b09374726",
      "0x8a8434A5952aC2CF4927bbEa3ace255c6dd165CD",
      "0x1f7e9321ce32af1f9ea1185fd10d31fea31ffd95",
      "0x1220868672d5b10f3e1cb9ab519e4d0b08545ea4",
      "0x94b17476a93b3262d87b9a326965d1e91f9c13e7",
      "0xd632f22692fac7611d2aa1c0d552930d43caed3b",
      "0xbcb91e689114b9cc865ad7871845c95241df4105",
      "0xce6431d21e3fb1036ce9973a3312368ed96f5ce7",
      "0x2cf99a343e4ecf49623e82f2ec6a9b62e16ff3fe",
      "0x5a6a4d54456819380173272a5e8e9b9904bdf41b",
      "0xc7de47b9ca2fc753d6a2f167d8b3e19c6d18b19a",
      "0x744793b5110f6ca9cc7cdfe1ce16677c3eb192ef",
      "0x8b83c4aa949254895507d09365229bc3a8c7f710",
      "0x2570f1bd5d2735314fc102eb12fc1afe9e6e7193",
      "0x1d08E7adC263CfC70b1BaBe6dC5Bb339c16Eec52",
      "0xe06a65e09ae18096b99770a809ba175fa05960e2",
      "0x1062fd8ed633c1f080754c19317cb3912810b5e5",
      "0x28ca243dc0ac075dd012fcf9375c25d18a844d96",
      "0x8ffc7b89412efd0d17edea2018f6634ea4c2fcb2",
      "0xd6982da59f1d26476e259559508f4135135cf9b8",
      "0x189b4e49b5caf33565095097b4b960f14032c7d0",
      "0x1ee81c56e42ec34039d993d12410d437ddea341e",
      "0x74345504eaea3d9408fc69ae7eb2d14095643c5b",
      "0xca554e2e2948a211d4650fe0f4e271f01f9cb5f1",
      "0x27cb9629ae3ee05cb266b99ca4124ec999303c9d",
      "0xd7bf9bb6bd088317effd116e2b70ea3a054cbceb",
      "0x16b54e3ac8e3ba088333985035b869847e36e770",
      "0x13ea95ce68185e334d3747539845a3b7643a8cab",
      "0x5018be882dcce5e3f2f3b0913ae2096b9b3fb61f",
      "0x52bf165abd26106d810733cc29faff68b96dece8",
    ]),
    getGaugePrices("ethereum", timestamp),
  ]);
}
export function curve1(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices2("fantom", defaultRegistries, timestamp),
    getGaugePrices("fantom", timestamp),
  ]);
}
export function curve2(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices2("arbitrum", defaultRegistries, timestamp),
    getTokenPrices2("arbitrum", [], timestamp, "eth-custom", [
      "0x2FE7AE43591E534C256A1594D326e5779E302Ff4",
      "0xec090cf6DD891D2d014beA6edAda6e05E025D93d",
      "0x73aF1150F265419Ef8a5DB41908B700C32D49135",
      "0x3aDf984c937FA6846E5a24E0A68521Bdaf767cE1",
      "0x8ce4e9d3246e3d629f8ed811c421054dc6542bd6",
      "0x81fdbd700db44c3e57639c2c4518630945c132a6",
      "0x73f8b9739a557d5822f0e431f5e03f614f3bd8a9",
      "0xdf96c0334d628e2fd084111761ae1016f3a1fb3d",
      "0xe699fd2b4ea36af0ca07cee042e0833ab831d067",
      "0x82670f35306253222f8a165869b28c64739ac62e",
      "0x4070c044abc8d9d22447dfe4b032405970878d06",
      "0x845c8bc94610807fcbab5dd2bc7ac9dabaff3c55",
      "0xebeec2edbbc66eb9055fe772b154f34d3dd686c8",
      "0x5c959d2c1a49b637fb988c40d663265f8bf6d289",
      "0xf7fed8ae0c5b78c19aadd68b700696933b0cefd9",
      "0xc8248953429d707c6a2815653eca89846ffaa63b",
      "0x8958ae46de6b33293dddc6cdfbe36900f4631851",
      "0x96aaf8f6a2e3f45aaf548b753a0e004211e0ad63",
      "0xe957ce03ccdd88f02ed8b05c9a3a28abef38514a",
      "0xad37295881f53fe6fdab54493a06cd84f988646b",
      "0x186cf879186986a20aadfb7ead50e3c20cb26cec",
      "0x86ea1191a219989d2da3a85c949a12a92f8ed3db",
      "0x93a416206b4ae3204cfe539edfee6bc05a62963e",
      "0x1fb84fa6d252762e8367ea607a6586e09dcebe3d",
      "0xe07f1151887b8fdc6800f737252f6b91b46b5865",
      "0xd3ca9bec3e681b0f578fd87f20ebcf2b7e0bb739",
      "0xa6c2e6a83d594e862cdb349396856f7ffe9a979b",
      "0x6579758e9e85434450d638cfbea0f2fe79856dda",
      "0x8f26c8041a963c5b0846c68f02d68c8cdfd7afdc",
      "0x49b720f1aab26260beaec93a7beb5bf2925b2a8f",
      "0x590f7e2b211fa5ff7840dd3c425b543363797701",
      "0x78483d06a82ae76e0ff9c72afd80e5b2cea3b2a0",
      "0x747a547e48ee52491794b8ea01cd81fc5d59ad84",
    ]),
    getGaugePrices("arbitrum", timestamp),
  ]);
}
export function curve3(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices2("optimism", defaultRegistries, timestamp),
    getTokenPrices2("optimism", [], timestamp, "eth-custom", [
      "0x95e0A2a90De52C0f03Ba17A0b218442f4f42A78e",
      "0x2ebd3f70aa2f29092f759418e4f9489d14ac403e",
      "0x8f63ccd329d4ba07a3c6703d94d3137a9cfbfc6c",
      "0x555aea44f348c4f53a0160335658a8619006c5b0",
      "0x56fc84bfa907b6ced228ed14a8489c88f7f3ec2a",
    ]),
    getGaugePrices("optimism", timestamp),
  ]);
}
export function curve4(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices2("polygon", defaultRegistries, timestamp),
    getTokenPrices2("polygon", [], timestamp, "eth-custom", [
      "0xa691d34abf93c0a77998e53b564becfaf46dae27",
      "0xA73EdCf18421B56D9AF1cE08A34E102E23b2C4B6",
      "0xc7c939A474CB10EB837894D1ed1a77C61B268Fa7",
    ]),
    getGaugePrices("polygon", timestamp),
  ]);
}
export function curve5(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices2("avax", defaultRegistries, timestamp),
    getGaugePrices("avax", timestamp),
  ]);
}
export function curve6(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices2("base", [], timestamp, "eth-custom", [
      "0xf6c5f01c7f3148891ad0e19df78743d31e390d1f",
      "0x6e53131f68a034873b6bfa15502af094ef0c5854",
      "0x6dfe79cece4f64c1a34f48cf5802492ab595257e",
      "0x3b9860321f03afe02d3ff9e4fdd4017dc6f4d7ca",
      "0x1f0dbecda414f401db46464864273cad19368706",
      "0x3e07f263c1ce5ec2a3f1ca87af56b80b27674d96",
      "0x68446d5f287c5dfaabff932efbecda2dd7e7861b",
      "0x70d410b739da81303a76169cdd406a746bde8b34",
      "0x5ecfa6940a33a2dad5c473896452f018c6c04577",
      "0x6dfe79cece4f64c1a34f48cf5802492ab595257e",
      "0x302a94e3c28c290eaf2a4605fc52e11eb915f378",
      "0x5ab01ee6208596f2204b85bdfa39d34c2add98f6",
      "0x02d55af4813a3a6826ef185935e4fc1defa45fb0",
      "0x798d81d60966d2e909468d87e7e4b6a8dafb1c36",
    ]),
  ]);
}
export function curve7(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices2("moonbeam", defaultRegistries, timestamp),
    getGaugePrices("moonbeam", timestamp),
  ]);
}
export function curve8(timestamp: number = 0) {
  return Promise.all([getTokenPrices2("aurora", defaultRegistries, timestamp)]);
}
export function curve9(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices2("celo", defaultRegistries, timestamp),
    getGaugePrices("celo", timestamp),
  ]);
}
export function curve10(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices2("bsc", defaultRegistries, timestamp),
    getTokenPrices2("bsc", [], timestamp, "eth-custom", [
      "0xa5e0e46462970c9ee8c2ecadcde254c483748ec4",
    ]),
  ]);
}
export function curve11(timestamp: number = 0) {
  return Promise.all([getTokenPrices2("bsc", ["pcs"], timestamp, "pcs")]);
}
export function curve12(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices2("xdai", defaultRegistries, timestamp),
    getGaugePrices("xdai", timestamp),
  ]);
}
export function curve13(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices2("kava", defaultRegistries, timestamp),
    getGaugePrices("kava", timestamp),
  ]);
}
export function curve14(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices2("fraxtal", defaultRegistries, timestamp),
    getGaugePrices("fraxtal", timestamp),
  ]);
}
export function curve15(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices2("sonic", defaultRegistries, timestamp),
    // getGaugePrices("sonic", timestamp),
  ]);
}

export const adapters = {
  curve,
  curve1,
  curve2,
  curve3,
  curve4,
  curve5,
  curve6,
  curve7,
  curve8,
  curve9,
  curve10,
  curve11,
  curve12,
  curve13,
  curve14,
  curve15,
};
