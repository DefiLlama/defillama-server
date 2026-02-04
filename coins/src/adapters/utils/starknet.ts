// https://www.starknetjs.com/docs/API/contract
// https://playground.open-rpc.org/?uiSchema%5BappBar%5D%5Bui:splitView%5D=false&schemaUrl=https://raw.githubusercontent.com/starkware-libs/starknet-specs/master/api/starknet_api_openrpc.json&uiSchema%5BappBar%5D%5Bui:input%5D=false&uiSchema%5BappBar%5D%5Bui:darkMode%5D=true&uiSchema%5BappBar%5D%5Bui:examplesDropdown%5D=false
// https://docs.alchemy.com/reference/starknet-getevents
import { Contract, validateAndParseAddress, hash, CallData } from "starknet";
import axios from "axios";

const STARKNET_RPC =
  process.env.STARKNET_RPC ?? "https://starknet-mainnet.public.blastapi.io";

function formCallBody(
  { abi, target, params = [], allAbi = [] }: any,
  id: any = 0,
) {
  if ((params || params === 0) && !Array.isArray(params)) params = [params];
  const contract = new Contract([abi, ...allAbi], target, null as any);
  const requestData: any = contract.populate(abi.name, params);
  requestData.entry_point_selector = hash.getSelectorFromName(
    requestData.entrypoint,
  );
  requestData.contract_address = requestData.contractAddress;
  delete requestData.contractAddress;
  delete requestData.entrypoint;
  if (abi.customInput === "address")
    requestData.calldata = params.map((i: any) => i.slice(2));
  return getCallBody(requestData);

  function getCallBody(i: any) {
    return {
      jsonrpc: "2.0",
      id,
      method: "starknet_call",
      params: [i, "latest"],
    };
  }
}

function parseOutput(result: any, abi: any, allAbi: any) {
  let response: any = new CallData([abi, ...allAbi]).parse(abi.name, result);
  // convert BigInt to string
  for (const key in response) {
    if (typeof response[key] === "bigint")
      response[key] = response[key].toString();
  }

  if (abi.outputs.length === 1 && !abi.outputs[0].type.includes("::")) {
    response = response[abi.outputs[0].name];
    if (abi.outputs[0].type === "Uint256") return +response;
    switch (abi.customType) {
      case "address":
        return validateAndParseAddress(response);
      case "Uint256":
        return +response;
    }
  }
  return response;
}

export async function call({
  abi,
  target,
  params = [],
  allAbi = [],
}: any = {}) {
  const {
    data: { result },
  } = await axios.post(
    STARKNET_RPC,
    formCallBody({ abi, target, params, allAbi }),
  );
  return parseOutput(result, abi, allAbi);
}

export function feltArrToStr(felts: bigint[]): string {
  return felts.reduce(
    (memo, felt) => memo + Buffer.from(felt.toString(16), "hex").toString(),
    "",
  );
}

export const cairoErc20Abis = {
  name: {
    name: "name",
    type: "function",
    inputs: [],
    outputs: [
      {
        type: "core::felt252",
      },
    ],
    state_mutability: "view",
  },
  symbol: {
    name: "symbol",
    type: "function",
    inputs: [],
    outputs: [
      {
        type: "core::felt252",
      },
    ],
    state_mutability: "view",
  },
  decimals: {
    name: "decimals",
    type: "function",
    inputs: [],
    outputs: [
      {
        type: "core::integer::u8",
      },
    ],
    state_mutability: "view",
  },
  totalSupply: {
    name: "total_supply",
    type: "function",
    inputs: [],
    outputs: [
      {
        type: "core::integer::u256",
      },
    ],
    state_mutability: "view",
  },
  balanceOf: {
    name: "balance_of",
    type: "function",
    inputs: [
      {
        name: "account",
        type: "core::starknet::contract_address::ContractAddress",
      },
    ],
    outputs: [
      {
        type: "core::integer::u256",
      },
    ],
    state_mutability: "view",
  },
};
