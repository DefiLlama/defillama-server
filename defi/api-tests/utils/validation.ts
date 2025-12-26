// Generic validation utilities using Zod
// Provides reusable validation functions with detailed error reporting

import { z } from 'zod';

// ============================================================================
// Validation Result Types
// ============================================================================

export type ValidationSuccess<T> = {
  success: true;
  data: T;
};

export type ValidationFailure = {
  success: false;
  errors: string[];
};

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

// ============================================================================
// Core Validation Functions
// ============================================================================

/**
 * Validate data against a Zod schema with detailed error reporting
 * @param data - Data to validate
 * @param schema - Zod schema to validate against
 * @param context - Optional context string for error messages
 * @returns Validation result with data or errors
 */
export function validate<T>(
  data: unknown,
  schema: z.ZodType<T>,
  context?: string
): ValidationResult<T> {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors = result.error.issues.map((issue: z.ZodIssue) => {
    const path = issue.path.join('.');
    const message = context 
      ? `${context}${path ? `.${path}` : ''}: ${issue.message}` 
      : `${path}: ${issue.message}`;
    return message;
  });
  
  if (context && errors.length > 0) {
    // Only log first 5 errors to prevent console spam
    const errorsToLog = errors.slice(0, 5);
    errorsToLog.forEach((err: string) => console.error(err));
    if (errors.length > 5) {
      console.error(`... and ${errors.length - 5} more validation errors`);
    }
  }
  
  return { success: false, errors };
}

/**
 * Validate an array of items with per-item error tracking
 * @param data - Array to validate
 * @param itemSchema - Zod schema for each item
 * @param context - Optional context string for error messages
 * @returns Validation result with validated data or errors
 */
export function validateArray<T>(
  data: unknown,
  itemSchema: z.ZodType<T>,
  context?: string
): ValidationResult<T[]> {
  if (!Array.isArray(data)) {
    const error = `${context || 'Array'}: Expected array, got ${typeof data}`;
    if (context) console.error(error);
    return { success: false, errors: [error] };
  }
  
  const errors: string[] = [];
  const validatedData: T[] = [];
  
  for (let i = 0; i < data.length; i++) {
    const result = itemSchema.safeParse(data[i]);
    if (result.success) {
      validatedData.push(result.data);
    } else {
      result.error.issues.forEach((issue: z.ZodIssue) => {
        const path = issue.path.length > 0 ? `.${issue.path.join('.')}` : '';
        const message = `${context || 'Array'}[${i}]${path}: ${issue.message}`;
        errors.push(message);
        if (context) console.error(message);
      });
    }
  }
  
  if (errors.length > 0) {
    return { success: false, errors };
  }
  
  return { success: true, data: validatedData };
}

/**
 * Quick boolean validation check without error details
 * @param data - Data to validate
 * @param schema - Zod schema to validate against
 * @returns True if valid, false otherwise
 */
export function isValid<T>(data: unknown, schema: z.ZodType<T>): data is T {
  return schema.safeParse(data).success;
}

/**
 * Create a type guard function from a Zod schema
 * @param schema - Zod schema
 * @returns Type guard function
 */
export function createTypeGuard<T>(schema: z.ZodType<T>) {
  return (data: unknown): data is T => {
    return schema.safeParse(data).success;
  };
}

/**
 * Parse and validate data, throwing an error if invalid
 * @param data - Data to parse
 * @param schema - Zod schema to validate against
 * @param context - Optional context for error message
 * @returns Parsed and validated data
 * @throws Error if validation fails
 */
export function parseOrThrow<T>(
  data: unknown,
  schema: z.ZodType<T>,
  context?: string
): T {
  const result = validate(data, schema, context);
  
  if (!result.success) {
    const errorMessage = context 
      ? `${context}: Validation failed\n${result.errors.join('\n')}`
      : `Validation failed\n${result.errors.join('\n')}`;
    throw new Error(errorMessage);
  }
  
  return result.data;
}

// ============================================================================
// Common Validation Schemas
// ============================================================================

export const commonValidation = {
  nonEmptyString: z.string().min(1),
  positiveNumber: z.number().positive().finite(),
  nonNegativeNumber: z.number().nonnegative().finite(),
  url: z.string().url(),
  httpUrl: z.string().regex(/^https?:\/\/.+/),
  email: z.string().email(),
  timestamp: z.number().int().min(1262304000).max(4102444800), // 2010-2100
  percentage: z.number().min(-100).max(100),
  hexColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  uuid: z.string().uuid(),
  isoDate: z.string().datetime(),
} as const;

