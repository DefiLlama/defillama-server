export interface result {
  success: boolean;
  input: {
    target: string;
  };
  output: any;
}
export interface multicall {
  target: string;
  params: string[];
}
