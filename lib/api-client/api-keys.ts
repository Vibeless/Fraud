'use server';

import { cookies } from 'next/headers';
import { apiClient } from './client';

/**
 * Fixed MVP scope list per AAD §3.2 and OAS §9.
 */
export const API_KEY_SCOPES = [
  'submissions:write',
  'submissions:read',
  'analyses:read',
  'campaigns:write',
  'campaigns:read',
] as const;

export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

export interface ApiKeyListItem {
  id: string;
  keyPrefix: string;
  name: string;
  scopes: ApiKeyScope[] | string[];
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export interface ApiKeyCreatedResponse {
  id: string;
  key: string;
  keyPrefix: string;
}

export interface ApiKeyListResponse {
  data: ApiKeyListItem[];
}

export interface CreateApiKeyParams {
  name: string;
  scopes: ApiKeyScope[] | string[];
  agencyId?: string;
}

/**
 * Resolves the bearer token from parameter or server cookie store.
 */
async function resolveToken(explicitToken?: string): Promise<string | undefined> {
  if (explicitToken) return explicitToken;
  try {
    const cookieStore = await cookies();
    return cookieStore.get('ci_access_token')?.value;
  } catch {
    return undefined;
  }
}

/**
 * Lists API keys accessible to the caller per OAS §9 & AAD §3.
 * - agency_admin: returns keys belonging to caller's agency.
 * - platform_admin: returns keys across all agencies.
 */
export async function listApiKeys(explicitToken?: string): Promise<ApiKeyListResponse> {
  const token = await resolveToken(explicitToken);

  return apiClient<ApiKeyListResponse>('api-keys', {
    method: 'GET',
    token,
  });
}

/**
 * Creates a new API key per OAS §9, AAD §3.1, and AAD §5.2.
 * - agency_admin: creates key for caller's agency.
 * - platform_admin: requires agencyId in params.
 * Returns the raw key secret exactly once.
 */
export async function createApiKey(
  params: CreateApiKeyParams,
  explicitToken?: string
): Promise<ApiKeyCreatedResponse> {
  const token = await resolveToken(explicitToken);

  return apiClient<ApiKeyCreatedResponse>('api-keys', {
    method: 'POST',
    body: JSON.stringify(params),
    token,
  });
}

/**
 * Revokes an API key immediately and irreversibly per OAS §9 & AAD §3.4.
 */
export async function revokeApiKey(id: string, explicitToken?: string): Promise<void> {
  const token = await resolveToken(explicitToken);

  await apiClient<void>(`api-keys/${id}`, {
    method: 'DELETE',
    token,
  });
}
