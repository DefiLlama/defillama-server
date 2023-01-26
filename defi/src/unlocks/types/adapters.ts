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
  receiver?: string;
  token: string;
  confirmed?: boolean;
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
  timestamps: number[];
  unlocked: number[];
  isContinuous: boolean;
};
export type ChartYAxisData = {
  start: number;
  increment: number;
  data: number[];
  end: number;
};
export type Protocol = {
  [section: string]: any;
};
export type RawSection = {
  section: string;
  results: RawResult[] | RawResult[][];
};
export type ChartConfig = {
  resolution: number;
  steps: number;
  timestamps: number[];
  unlocked: number[];
  workingQuantity: number;
  workingTimestamp: number;
  roundedStart: number;
  roundedEnd: number;
};
export type ChartSection = {
  data: ChartData;
  section: string;
};
export type Dataset = {
  label: string;
  data: number[];
  borderColor: string;
  backgroundColor: string;
  fill: boolean;
};
