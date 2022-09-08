export interface Result {
  success: boolean;
  input: {
    target: string;
    params: any[];
  };
  output: any;
}
export interface Multicall {
  target: string;
  params: any[];
}
export interface MultiCallResults {
  output: Result[];
}
export interface TokenInfos {
  supplies: Result[];
  lpDecimals: Result[];
  underlyingDecimalAs: Result[];
  underlyingDecimalBs: Result[];
  symbolAs: Result[];
  symbolBs: Result[];
  lpSymbols: Result[];
}
