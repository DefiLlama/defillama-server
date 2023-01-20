export type Exports = {
  timestampFrom: number;
  sources: string[];
  vestingSchedule: Allocation;
  comments: string | undefined;
  cap: number | Function | undefined;
};
export type Contracts = { [tag: string]: string };
export type Allocation = {
  insiders: SubAllocation[];
  community: SubAllocation[];
};

export type SubAllocation = {
  name: string;
  total: number;
  from?: number;
  until?: number;
  schedule: any;
};
export type AdapterResult = {
  type: string;
  start?: number;
  end?: number;
  amount: number;
  steps?: number;
  cliff?: number;
  stepDuration?: number;
  receiver: string;
  token: string;
};
export type RawResult = {
  timestamp: number;
  change: number;
  continuousEnd: number | undefined;
};
export type StepAdapterResult = {
  start: number;
  stepDuration: number;
  steps: number;
  amount: number;
  type: string;
};
export type CliffAdapterResult = {
  type: string;
  start: number;
  amount: number;
};
export type LinearAdapterResult = {
  type: string;
  start: number;
  end: number;
  amount: number;
  cliff: number;
};
export type ChartData = {
  timestamp: number[];
  data: ChartYAxisData[];
};
export type ChartYAxisData = {
  start: number;
  increment: number;
  data: number[];
  end: number;
};
export type Protocol = {
  [section: string]:
    | Promise<AdapterResult>
    | Promise<AdapterResult[]>
    | Promise<AdapterResult[][]>
    | Promise<StepAdapterResult>
    | Promise<CliffAdapterResult>
    | Promise<LinearAdapterResult>
    | AdapterResult
    | AdapterResult[]
    | AdapterResult[][]
    | StepAdapterResult
    | CliffAdapterResult
    | LinearAdapterResult
    | StepAdapterResult[]
    | CliffAdapterResult[]
    | LinearAdapterResult[];
};
