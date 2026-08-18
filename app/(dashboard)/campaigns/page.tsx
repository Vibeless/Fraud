import { cookies } from 'next/headers';
import { listCampaigns, PaginatedCampaignsResponse } from '@/lib/api-client/campaigns';
import { CampaignsListClient } from '@/components/campaigns/CampaignsListClient';

/**
 * Campaigns List Page per DUXS §4.4 and FFS §2.
 * Server component fetching initial campaigns data to avoid client loading flash (FFS §5).
 */
export default async function CampaignsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('ci_access_token')?.value;

  let initialData: PaginatedCampaignsResponse | null = null;

  if (token) {
    try {
      initialData = await listCampaigns({ page: 1, pageSize: 25 }, token);
    } catch {
      // Fallback to client-side loading if SSR fetch fails or token needs client refresh
      initialData = null;
    }
  }

  return <CampaignsListClient initialData={initialData} />;
}
