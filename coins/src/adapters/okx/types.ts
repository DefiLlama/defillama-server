export type Method = "GET" | "POST";

export type Endpoint = {
  path: string;
  method: Method;
  body: any;
  params: any;
};

export type OkxResponse = {
  code: number;
  data: any;
  msg: "success";
};

export type OkxTokenResponse = {
  chainIndex: number;
  tokenAddress: string;
  time: number;
  price: number;
};

export type OkxTokenQuery = { chainIndex: string; tokenAddress: string };

export type MetadataResults = {
  [chain: string]: { [token: string]: { decimals: number; symbol: string } };
};

export type TokenPK = { chain: string; address: string };
