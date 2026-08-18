import { cookies } from 'next/headers';
import { listApiKeys, ApiKeyListResponse } from '@/lib/api-client/api-keys';
import { ApiKeysClient } from '@/components/api-keys/ApiKeysClient';

/**
 * Settings — API Keys Page per DUXS §4.6 and FFS §2.
 * Server component fetching initial API keys directly using caller session cookie (FFS §5).
 * Create and revoke API keys used for programmatic submission intake.
 */
export default async function ApiKeysPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('ci_access_token')?.value;

  let initialData: ApiKeyListResponse | null = null;

  if (token) {
    try {
      initialData = await listApiKeys(token);
    } catch {
      // Fallback to client-side loading if SSR fetch fails or unauthenticated
      initialData = null;
    }
  }

  return <ApiKeysClient initialData={initialData} />;
}
