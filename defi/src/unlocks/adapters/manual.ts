import {
  StepAdapterResult,
  CliffAdapterResult,
  LinearAdapterResult,
} from "../types/adapters";

export const manualStep = (
  start: number,
  duration: number,
  steps: number,
  amount: number,
): StepAdapterResult => ({ type: "step", start, duration, steps, amount });

export const manualCliff = (
  start: number,
  amount: number,
): CliffAdapterResult => ({ type: "cliff", start, amount });

export const manualLinear = (
  start: number,
  end: number,
  amount: number,
  cliff: number,
): LinearAdapterResult => ({ type: "linear", start, end, amount, cliff });
