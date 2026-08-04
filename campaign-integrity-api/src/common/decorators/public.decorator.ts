import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";

/**
 * Marks a route as not requiring authentication (e.g. POST /v1/auth/login,
 * GET /v1/health). Every other route is auth-required by default — this
 * is an explicit opt-out, not an opt-in, so a forgotten guard fails closed
 * rather than open.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
