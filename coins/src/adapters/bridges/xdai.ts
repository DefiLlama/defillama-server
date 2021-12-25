import { fetch, formatExtraTokens } from "../utils"

const bridgeContract = "0xf6A78083ca3e2a662D6dd1703c939c8aCE2e268d";
const abiXdaiBridgeAbi = {
  type: "function",
  stateMutability: "view",
  payable: false,
  outputs: [
    {
      type: "address",
      name: "",
    },
  ],
  name: "foreignTokenAddress",
  inputs: [
    {
      internalType: "address",
      type: "address",
      name: "_homeToken",
    },
  ],
  constant: true,
};

// emit NewTokenRegistered(_nativeToken, _bridgedToken);

export default async function bridge() {
    return async (address) => {

  
      // const result = await sdk.api.abi.call({
      //   target: bridgeAdd,
      //   abi: abiXdaiBridgeAbi,
      //   params: [address],
      //   chain: "xdai",
      // });
      // if (result.output === "0x0000000000000000000000000000000000000000") {
      //   return `xdai:${address}`;
      // }
      // // XDAI -> DAI
      // return result.output;
    };
  }

  /*
        if (
        address.toLowerCase() === "0x44fa8e6f47987339850636f88629646662444217" ||
        address.toLowerCase() === "0xe91d153e0b41518a2ce8dd3d7944fa863463a97d"
      ) {
        return `0x6b175474e89094c44da98b954eedeac495271d0f`;
      }
      if (
        address.toLowerCase() === "0x6a023ccd1ff6f2045c3309768ead9e68f978f6e1"
      ) {
        return `0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2`;
      }
      if (
        address.toLowerCase() === "0xddafbb505ad214d7b80b1f830fccc89b60fb7a83"
      ) {
        return `0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48`;
      }
      if (
        address.toLowerCase() === "0x4537e328bf7e4efa29d05caea260d7fe26af9d74"
      ) {
        return `0x1f9840a85d5af5bf1d1762f925bdaddc4201f984`;
      }
      if (
        address.toLowerCase() === "0x4ecaba5870353805a9f068101a40e0f32ed605c6"
      ) {
        return `0xdac17f958d2ee523a2206206994597c13d831ec7`;
      }
      if (
        address.toLowerCase() === "0x7122d7661c4564b7c6cd4878b06766489a6028a2"
      ) {
        return `0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0`;
      }
      if (
        address.toLowerCase() === "0x8e5bbbb09ed1ebde8674cda39a0c169401db4252"
      ) {
        return `0x2260fac5e5542a773aa44fbcfedf7c193bc2c599`;
      }
      */