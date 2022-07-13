export interface result {
  success: boolean;
  input: {
    target: string;
    params: any[];
  };
  output: any;
}
export interface multicall {
  target: string;
  params: string[];
}
export interface multiCallResults {
  output: result[];
}
