import { z } from 'zod';

// Narrative performance data point schema
// Each object has a date field and dynamic category fields with percentage values
export const narrativePerformancePointSchema = z.object({
  date: z.number(),
}).catchall(z.number()); // Allow any additional string keys with number values

// Narrative performance response is an array of data points
export const narrativePerformanceResponseSchema = z.array(narrativePerformancePointSchema);

