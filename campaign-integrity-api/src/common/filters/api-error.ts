/**
 * The single error shape every endpoint returns — see
 * docs/specs/02_API_Specification_OAS.md §3. Never construct an ad hoc
 * error body; throw an HttpException and let HttpExceptionFilter shape it.
 */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export const ErrorCode = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  DUPLICATE_SUBMISSION: "DUPLICATE_SUBMISSION",
  RATE_LIMITED: "RATE_LIMITED",
  ANALYSIS_FAILED: "ANALYSIS_FAILED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
