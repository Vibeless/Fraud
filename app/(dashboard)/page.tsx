import { cookies } from 'next/headers';
import { listSubmissions, PaginatedSubmissionsResponse } from '@/lib/api-client/submissions';
import { SubmissionsQueueClient } from '@/components/submissions/SubmissionsQueueClient';

/**
 * Submissions Queue Root Page per DUXS §4.2 and FFS §2.
 * Server component fetching initial submissions data to prevent client loading flash (FFS §5).
 */
export default async function SubmissionsRootPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('ci_access_token')?.value;

  let initialData: PaginatedSubmissionsResponse | null = null;

  if (token) {
    try {
      initialData = await listSubmissions({ page: 1, pageSize: 25 }, token);
    } catch {
      // If server-side fetch fails (e.g. invalid/expired token awaiting client refresh), fallback to client-side load
      initialData = null;
    }
  }

  return <SubmissionsQueueClient initialData={initialData} />;
}
