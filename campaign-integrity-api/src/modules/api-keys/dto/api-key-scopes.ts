/**
 * Fixed MVP scope list per AAD §3.2.
 */
export const API_KEY_SCOPES = [
  "submissions:write",
  "submissions:read",
  "analyses:read",
  "campaigns:write",
  "campaigns:read",
] as const;

export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];
