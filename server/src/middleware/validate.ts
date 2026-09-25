import { NextFunction, Request, Response } from 'express';

// Lightweight, dependency-free request-body validation. Declare a schema per
// route; invalid requests get a clean 400 with a list of field errors before
// the handler ever runs.

type FieldType = 'string' | 'number' | 'integer' | 'boolean';

export type FieldRule = {
  type: FieldType;
  required?: boolean;
  /** number → min value; string → min length */
  min?: number;
  /** number → max value; string → max length */
  max?: number;
  enum?: ReadonlyArray<string | number>;
  pattern?: RegExp;
};

export type BodySchema = Record<string, FieldRule>;

export function validateBody(schema: BodySchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const body: Record<string, unknown> =
      req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {};
    const errors: string[] = [];

    for (const [field, rule] of Object.entries(schema)) {
      const value = body[field];
      const missing = value === undefined || value === null || value === '';

      if (missing) {
        if (rule.required) errors.push(`${field} is required`);
        continue;
      }

      if (rule.type === 'number' || rule.type === 'integer') {
        // Strictly JSON numbers: Number(true) is 1 and Number("5e3") is 5000,
        // which let booleans and strings through as numbers.
        const n = typeof value === 'number' ? value : NaN;
        if (!Number.isFinite(n)) {
          errors.push(`${field} must be a finite number`);
          continue;
        }
        if (rule.type === 'integer' && !Number.isInteger(n)) {
          errors.push(`${field} must be an integer`);
        }
        if (rule.min !== undefined && n < rule.min) errors.push(`${field} must be >= ${rule.min}`);
        if (rule.max !== undefined && n > rule.max) errors.push(`${field} must be <= ${rule.max}`);
        if (rule.enum && !rule.enum.includes(n)) errors.push(`${field} is not an allowed value`);
      } else if (rule.type === 'boolean') {
        if (typeof value !== 'boolean') errors.push(`${field} must be a boolean`);
      } else {
        const s = String(value);
        if (rule.min !== undefined && s.length < rule.min) {
          errors.push(`${field} must be at least ${rule.min} characters`);
        }
        if (rule.max !== undefined && s.length > rule.max) {
          errors.push(`${field} must be at most ${rule.max} characters`);
        }
        if (rule.enum && !rule.enum.includes(s)) errors.push(`${field} is not an allowed value`);
        if (rule.pattern && !rule.pattern.test(s)) errors.push(`${field} has an invalid format`);
      }
    }

    if (errors.length) {
      res.status(400).json({ message: 'Validation failed', errors });
      return;
    }

    next();
  };
}
