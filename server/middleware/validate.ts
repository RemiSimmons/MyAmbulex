import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";

/**
 * Middleware factory for validating request body against a Zod schema
 * @param schema The Zod schema to validate against
 * @returns Express middleware function
 */
export function validate(schema: z.ZodType<any, any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.body);
      
      if (!result.success) {
        // Convert Zod error to a more readable format
        const validationError = fromZodError(result.error);
        return res.status(400).json({
          message: "Validation error",
          errors: validationError.details
        });
      }
      
      // Validation passed, update request body with validated data
      req.body = result.data;
      next();
    } catch (error) {
      console.error("Validation error:", error);
      res.status(500).json({ message: "Server validation error" });
    }
  };
}