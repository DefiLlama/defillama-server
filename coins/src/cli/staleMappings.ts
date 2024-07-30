import mappings from "../adapters/tokenMapping_added.json";
import PromisePool from "@supercharge/promise-pool";
import fetch from "node-fetch";

async function main() {
  const array: string[] = [];
  Object.keys(mappings).map((chain: any) =>
    Object.keys(mappings[chain as keyof typeof mappings]).map(
      (address: string) => array.push(`${chain}:${address}`),
    ),
  );
  const errors: string[] = [];
  await PromisePool.withConcurrency(5)
    .for(array)
    .process(async (key: string) => {
      const res = await fetch(
        `https://coins.llama.fi/prices/current/${key}?apikey=${process.env.COINS_KEY}`,
      ).then((r) => r.json());
      if (!Object.keys(res.coins).length) errors.push(key);
    })
    .catch((e) => {
      e;
    });

  return;
}
main(); // ts-node coins/src/cli/staleMappings.ts
const errors = [
  "nova:0x657a66332a65b535da6c5d67b8cd1d410c161a08",
  "nova:0x0000000000000000000000000000000000000000",
  "metis:0x5801d0e1c7d977d78e4890880b8e579eb4943276",
  "velas:0xaadbaa6758fc00dec9b43a0364a372605d8f1883",
  "optimism:0xc5db22719a06418028a40a9b5e9a7c02959d0d08",
  "bsc:0xa35d95872d8eb056eb2cbd67d25124a6add7455e",
  "bsc:0x808a3f2639a5cd54d64ed768192369bcd729100e",
  "bsc:0xc5fb6476a6518dd35687e0ad2670cb8ab5a0d4c5",
  "bsc:0x42586ef4495bb512a86cf7496f6ef85ae7d69a64",
  "bsc:0xbb9858603b1fb9375f6df972650343e985186ac5",
  "bsc:0x8b04e56a8cd5f4d465b784ccf564899f30aaf88c",
  "bsc:0x6a46d878401f46b4c7f665f065e0667580e031ec",
  "bsc:0x316622977073bbc3df32e7d2a9b3c77596a0a603",
  "bsc:0xdcecf0664c33321ceca2effce701e710a2d28a3f",
  "fantom:0x4a89338a2079a01edbf5027330eac10b615024e5",
  "fantom:0xe3a486c1903ea794eed5d5fa0c9473c7d7708f40",
  "bittorrent:0x8d193c6efa90bcff940a98785d1ce9d093d3dc8a",
  "ethereum:0xbb6881874825e60e1160416d6c426eae65f2459e",
  "ethereum:0xef779cf3d260dbe6177b30ff08b10db591a6dd9c",
  "ethereum:0x42ef9077d8e79689799673ae588e046f8832cb95",
  "ethereum:0xd3d13a578a53685b4ac36a1bab31912d2b2a2f36",
  "ethereum:0x2fc6e9c1b2c07e18632efe51879415a580ad22e1",
  "ethereum:0xdc0b02849bb8e0f126a216a2840275da829709b0",
  "ethereum:0x94671a3cee8c7a12ea72602978d1bb84e920efb2",
  "ethereum:0x808d3e6b23516967ceae4f17a5f9038383ed5311",
  "ethereum:0xd3b5d9a561c293fb42b446fe7e237daa9bf9aa84",
  "ethereum:0x15a629f0665a3eb97d7ae9a7ce7abf73aeb79415",
  "ethereum:0xeff721eae19885e17f5b80187d6527aad3ffc8de",
  "ethereum:0xf49764c9c5d644ece6ae2d18ffd9f1e902629777",
  "ethereum:0xadf15ec41689fc5b6dca0db7c53c9bfe7981e655",
  "ethereum:0xc7d9c108d4e1dd1484d3e2568d7f74bfd763d356",
  "ethereum:0x65f7ba4ec257af7c55fd5854e5f6356bbd0fb8ec",
  "ethereum:0x2163383c1f4e74fe36c50e6154c7f18d9fd06d6f",
  "ethereum:0x9fcf418b971134625cdf38448b949c8640971671",
  "ethereum:0xf56b164efd3cfc02ba739b719b6526a6fa1ca32a",
  "ethereum:0xb1c9bc94acd2fae6aabf4ffae4429b93512a81d2",
  "ethereum:0x5067006f830224960fb419d7f25a3a53e9919bb0",
  "ethereum:0x465a5a630482f3abd6d3b84b39b29b07214d19e5",
  "kaia:0x5388ce775de8f7a69d17fd5caa9f7dbfee65dfce",
  "kaia:0x0268dbed3832b87582b1fa508acf5958cbb1cd74",
  "kaia:0xd2137fdf10bd9e4e850c17539eb24cfe28777753",
  "oasis:0x6cb9750a92643382e020ea9a170abb83df05f30b",
  "oasis:0x94fbffe5698db6f54d6ca524dbe673a7729014be",
  "harmony:0xed0b4b0f0e2c17646682fc98ace09feb99af3ade",
  "harmony:0xea589e93ff18b1a1f1e9bac7ef3e86ab62addc79",
  "avax:0x5c49b268c9841aff1cc3b0a418ff5c3442ee3f3b",
  "moonbeam:0x8e70cd5b4ff3f62659049e74b6649c6603a0e594",
  "moonbeam:0xc234a67a4f840e61ade794be47de455361b52413",
  "polygon:0x9fffb2f49adfc231b44ddcff3ffcf0e81b06430a",
  "polygon:0x1ddcaa4ed761428ae348befc6718bcb12e63bfaa",
  "polygon:0x6d3cc56dfc016151ee2613bdde0e03af9ba885cc",
  "polygon:0xe4f7761b541668f88d04fe9f2e9df10ca613aef7",
  "polygon:0x81a123f10c78216d32f8655eb1a88b5e9a3e9f2f",
  "polygon:0x64875aaa68d1d5521666c67d692ee0b926b08b2f",
  "polygon:0xf826a91e8de52bc1baf40d88203e572dc2551aa3",
  "polygon:0x6002410dda2fb88b4d0dc3c1d562f7761191ea80",
  "arbitrum:0xf202ab403cd7e90197ec0f010ee897e283037706",
  "arbitrum:0x40ea7f6d6964413d4a26a0a268542dae9f55768e",
  "arbitrum:0x9ef758ac000a354479e538b8b2f01b917b8e89e7",
  "solana:JET6zMJWkCN9tpRT2v2jfAmm5VnQFDpUBCyaKojmGtz",
  "solana:PUhuAtMHsKavMTwZsLaDeKy2jb7ciETHJP7rhbKLJGY",
  "astar:0xcdb32eed99aa19d39e5d6ec45ba74dc4afec549f",
  "astar:0xc5bcac31cf55806646017395ad119af2441aee37",
  "astar:0x6df98e5fbff3041105cb986b9d44c572a43fcd22",
  "astar:0x257f1a047948f73158dadd03eb84b34498bcdc60",
  "wemix:0xc1be9a4d5d45beeacae296a7bd5fadbfc14602c4",
  "wemix:0x9b377bd7db130e8bd2f3641e0e161cb613da93de",
  "wemix:0x2b58644b9f210ebb8fbf4c27066f9d1d97b03cbc",
  "wemix:0x765277eebeca2e31912c9946eae1021199b39c61",
  "wemix:0x461d52769884ca6235b685ef2040f47d30c94eb5",
  "wemix:0x8e81fcc2d4a3baa0ee9044e0d7e36f59c9bba9c1",
  "wemix:0x2c78f1b70ccf63cdee49f9233e9faa99d43aa07e",
  "wemix:0xe3f5a90f9cb311505cd691a46596599aa1a0ad7d",
  "wemix:0xa649325aa7c5093d12d6f98eb4378deae68ce23f",
  "step:0x818ec0a7fe18ff94269904fced6ae3dae6d6dc0b",
  "step:0xfa9343c3897324496a05fc75abed6bac29f8a40f",
  "step:0xe3f5a90f9cb311505cd691a46596599aa1a0ad7d",
  "step:0xefaeee334f0fd1712f9a8cc375f427d9cdd40d73",
  "zyx:0xc9e1aea009b0bae9141f3dc7523fb42fd48c8656",
  "terra:terra1dy9kmlm4anr92e42mrkjwzyvfqwz66un00rwr5",
  "terra:terra15k5r9r8dl8r7xlr29pry8a9w7sghehcnv5mgp6",
  "terra:terra17y9qkl8dfkeg4py7n0g5407emqnemc3yqk5rup",
  "terra:terra1hzh9vpxhsk8253se0vv5jj6etdvxu3nv8z07zu",
  "terra:terra1kc87mu460fwkqte29rquh4hc20m54fxwtsx7gp",
  "terra:terra1dzhzukyezv0etz22ud940z7adyv7xgcjkahuun",
  "terra:terra1vwz7t30q76s7xx6qgtxdqnu6vpr3ak3vw62ygk",
  "orai:orai1gzvndtzceqwfymu2kqhta2jn6gmzxvzqwdgvjw",
  "near:marmaj.tkn.near",
  "near:token.marmaj.near",
  "cube:0x0000000000000000000000000000000000000000",
  "hoo:0x0000000000000000000000000000000000000000",
  "hoo:0x3eff9d389d13d6352bfb498bcf616ef9b1beac87",
  "cube:0x9d3f61338d6eb394e378d28c1fd17d5909ac6591",
  "milkomeda_a1:0xfa9343c3897324496a05fc75abed6bac29f8a40f",
  "milkomeda_a1:0xefaeee334f0fd1712f9a8cc375f427d9cdd40d73",
  "milkomeda_a1:0xe3f5a90f9cb311505cd691a46596599aa1a0ad7d",
  "bitgert:0x0eb9036cbe0f052386f36170c6b07ef0a0e3f710",
  "bitgert:0x11203a00a9134db8586381c4b2fca0816476b3fd",
  "echelon:0x0000000000000000000000000000000000000000",
  "echelon:0xadee5159f4f82a35b9068a6c810bdc6c599ba6a8",
  "kekchain:0x54bd9d8d758ac3717b37b7dc726877a23aff1b89",
  "kekchain:0x0000000000000000000000000000000000000000",
  "kekchain:0x71ec0cb8f7dd4f4c5bd4204015c4c287fbdaa04a",
  "aptos:0x8d87a65ba30e09357fa2edea2c80dbac296e5dec2b18287113500b902942929d::celer_coin_manager::BnbCoin",
  "dogechain:0x1df5c9b7789bd1416d005c15a42762481c95edc2",
  "dogechain:0xbfbb7b1d22ff521a541170cafe0c9a7f20d09c3b",
  "canto:0x80a16016cc4a2e6a2caca8a4a498b1699ff0f844",
  "canto:0x38d11b40d2173009adb245b869e90525950ae345",
  "algorand:6547014",
  "algorand:239444645",
  "algorand:300208676",
  "algorand:342889824",
  "algorand:163650",
  "algorand:297995609",
  "algorand:463554836",
  "algorand:511484048",
  "algorand:684649988",
  "algorand:692085161",
  "algorand:792313023",
  "algorand:871930188",

  "asset#tezos:kt18fp5rctw7mbwdmzfwjlduhs5mejmagdsz-17",
  "asset#tezos:kt18fp5rctw7mbwdmzfwjlduhs5mejmagdsz-11",
  "asset#tezos:kt18fp5rctw7mbwdmzfwjlduhs5mejmagdsz-19",
  "asset#tezos:kt18fp5rctw7mbwdmzfwjlduhs5mejmagdsz-1",
  "asset#tezos:kt18fp5rctw7mbwdmzfwjlduhs5mejmagdsz-20",
  "asset#tezos:kt18fp5rctw7mbwdmzfwjlduhs5mejmagdsz-5",
  "asset#tezos:kt18fp5rctw7mbwdmzfwjlduhs5mejmagdsz-18",
  "asset#tezos:kt1ussfaxyqcjsvpeid7u1bwgky3tayn7nwy-3",
  "asset#tezos:kt1ussfaxyqcjsvpeid7u1bwgky3tayn7nwy-4",
  "asset#tezos:kt1ussfaxyqcjsvpeid7u1bwgky3tayn7nwy-5",

  "tezos:KT18fp5rcTW7mbWDmzFwjLDUhs5MeJmagDSZ-17",
  "tezos:KT18fp5rcTW7mbWDmzFwjLDUhs5MeJmagDSZ-11",
  "tezos:KT18fp5rcTW7mbWDmzFwjLDUhs5MeJmagDSZ-19",
  "tezos:KT18fp5rcTW7mbWDmzFwjLDUhs5MeJmagDSZ-1",
  "tezos:KT18fp5rcTW7mbWDmzFwjLDUhs5MeJmagDSZ-20",
  "tezos:KT18fp5rcTW7mbWDmzFwjLDUhs5MeJmagDSZ-5",
  "tezos:KT18fp5rcTW7mbWDmzFwjLDUhs5MeJmagDSZ-18",
  "tezos:KT1UsSfaXyqcjSVPeiD7U1bWgKy3taYN7NWY-3",
  "tezos:KT1UsSfaXyqcjSVPeiD7U1bWgKy3taYN7NWY-4",
  "tezos:KT1UsSfaXyqcjSVPeiD7U1bWgKy3taYN7NWY-5",
  "godwoken_v1:0xfa9343c3897324496a05fc75abed6bac29f8a40f",
  "godwoken_v1:0xe3f5a90f9cb311505cd691a46596599aa1a0ad7d",
  "godwoken_v1:0xb44a9b6905af7c801311e8f4e76932ee959c663c",
  "godwoken_v1:0x765277eebeca2e31912c9946eae1021199b39c61",
  "waves:DSbbhLsSTeDg5Lsiufk2Aneh3DjVqJuPr2M9uU1gwy5p",
  "waves:9sQutD5HnRvjM1uui5cVC4w9xkMPAfYEV8ymug3Mon2Y",
  "waves:DHgwrRvVyqJsepd32YbBqUeDH4GJ1N984X8QoekjgH8J",
  "songbird:0x70ad7172ef0b131a1428d0c1f66457eb041f2176",
  "curio:0x134ebab7883dfa9d04d20674dd8a8a995fb40ced",
  "gochain:0x67bbb47f6942486184f08a671155fcfa6cad8d71",
  "smartbch:0x24d8d5cbc14fa6a740c3375733f0287188f8df3b",
  "vision:0x79ffbc4fff98b821d59dbd7b33f91a2783006b6f",
  "kava:0x332730a4f6e03d9c55829435f10360e13cfa41ff",
  "kava:0xb44a9b6905af7c801311e8f4e76932ee959c663c",
  "kava:0xfa9343c3897324496a05fc75abed6bac29f8a40f",
  "kava:0x765277eebeca2e31912c9946eae1021199b39c61",
  "kava:0x818ec0a7fe18ff94269904fced6ae3dae6d6dc0b",
  "kava:0x7c598c96d02398d89fbcb9d41eab3df0c16f227d",
  "kava:0xe3f5a90f9cb311505cd691a46596599aa1a0ad7d",
  "kava:0xa0eeda2e3075092d66384fe8c91a1da4bca21788",
  "callisto:0x9fae2529863bd691b4a7171bdfcf33c7ebb10a65",
  "iotex:0x3fe04320885e6124231254c802004871be681218",
  "iotex:0x490cfbf9b9c43633ddd1968d062996227ef438a9",
  "iotex:0x176cb5113b4885b3a194bd69056ac3fe37a4b95c",
  "tlchain:0x422b6cdf97c750a0edcddc39c88f25379e59e96e",
  "ethpow:0x5df101f56ea643e06066392d266e9f4366b9186d",
  "ethpow:0xaf3ccfd9b59b36628cc2f659a09d6440795b2520",
  "ethpow:0x11bbb41b3e8baf7f75773db7428d5acee25fec75",
  "ethpow:0x8a496486f4c7cb840555bc2be327cba1447027c3",
  "ethpow:0x312b15d6d531ea0fe91ddd212db8c0f37e4cc698",
  "xdc:0xd04275e2fd2875beaade6a80b39a75d4fe267df6",
  "elrond:KOSON-5dd4fa",
  "elrond:CYC-b4ed61",
  "elrond:LPAD-84628f",
  "elrond:FITY-73f8fc",
  "elrond:UPARK-982dd6",
  "elrond:TLC-1a2357",
  "elrond:erd1qqqqqqqqqqqqqpgq3ahw8fctzfnwgvq2g4hjsqzkkvgl9ksr2jps646dnj",
  "dexit:0x414b8baf9950c87804cf7e23bb43a58ae7e1e202",
  "dexit:0x0000000000000000000000000000000000000000",
  "ibc:DBF5FA602C46392DE9F4796A0FC7D02F3A8A3D32CA3FAA50B761D4AA6F619E95",
  "ibc:764D1629980B02BAFF3D25BEE4FB1E0C5E350AFA252FDF66E68E10D2179A826A",
  "ibc:1620B95419728A7DEF482DEB9462DD6B9FA120BCB49CCCF74209A56AB9835E59",
  "ibc:4171A6F59F8A708D807E03B43FA0E16EC7041C189557B7A8E519757424367D41",
  "bitindi:0x15E162205421dc3A47b15A1A740FbF5EAbB77921",
  "bitindi:0x0000000000000000000000000000000000000000",
  "europa:0x2B4e4899b53E8b7958c4591a6d02f9C0b5c50F8f",
  "stacks:SPSCWDV3RKV5ZRN1FQD84YE1NQFEDJ9R1F4DYQ11.newyorkcitycoin-token-v2::newyorkcitycoin",
  "stacks:SP1H1733V5MZ3SZ9XRW9FKYGEZT0JDGEB8Y634C7R.miamicoin-token-v2::miamicoin",
  "stacks:SP2H8PY27SEZ03MWRKS5XABZYQN17ETGQS3527SA5.newyorkcitycoin-token::newyorkcitycoin",
  "stacks:SP466FNC0P7JWTNM2R9T199QRZN1MYEDTAR0KP27.miamicoin-token::miamicoin",
  "map:0x141b30Dd30FAFb87ec10312d52e5dbD86122FE14",
  "map:0x640a4C0AaA4870BaDE2F646B7Da87b3D53819C4f",
  "eos_evm:0x922d641a426dcffaef11680e5358f34d97d112e1",
  "eos_evm:0xfa9343c3897324496a05fc75abed6bac29f8a40f",
  "eos_evm:0x765277eebeca2e31912c9946eae1021199b39c61",
  "eos_evm:0xefaeee334f0fd1712f9a8cc375f427d9cdd40d73",
  "onus:0xfe39fdc0012dcf10c9f674ea7e74889e4d71a226",
  "manta:0x387660BC95682587efC12C543c987ABf0fB9778f",
  "fraxtal:0xfc00000000000000000000000000000000000008",
  "fraxtal:0xfc00000000000000000000000000000000000007",
  "fraxtal:0xfc00000000000000000000000000000000000004",
];
