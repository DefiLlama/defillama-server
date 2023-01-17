import {
  StepAdapterResult,
  CliffAdapterResult,
  LinearAdapterResult,
} from "../types/adapters";

export const manualStep = (
  start: number,
  stepDuration: number,
  steps: number,
  amount: number,
): StepAdapterResult => ({ type: "step", start, stepDuration, steps, amount });

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
