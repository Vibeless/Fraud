import React from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { getCampaign, Campaign } from '@/lib/api-client/campaigns';
import { listSubmissions, PaginatedSubmissionsResponse } from '@/lib/api-client/submissions';
import { CampaignDetailClient } from '@/components/campaigns/CampaignDetailClient';

interface CampaignDetailPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Campaign Detail Page per DUXS §4.4 and FFS §2.
 * Pre-filters Submissions Queue to this campaign and exposes lifecycle management actions.
 */
export default async function CampaignDetailPage({ params }: CampaignDetailPageProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('ci_access_token')?.value;

  let campaign: Campaign | null = null;
  let initialSubmissions: PaginatedSubmissionsResponse | null = null;
  let errorMsg: string | null = null;

  try {
    campaign = await getCampaign(id, token);

    // Initial fetch for submissions assigned to this campaign
    try {
      initialSubmissions = await listSubmissions({ campaignId: id, page: 1, pageSize: 25 }, token);
    } catch {
      initialSubmissions = null;
    }
  } catch (err: unknown) {
    errorMsg = err instanceof Error ? err.message : 'Failed to load campaign';
  }

  if (errorMsg || !campaign) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-slate-900">Campaign Not Found</h2>
        <p className="mt-1 text-sm text-slate-500">
          {errorMsg || `No campaign with ID "${id}" was found for your agency.`}
        </p>
        <div className="mt-6">
          <Link
            href="/campaigns"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
          >
            ← Back to Campaigns
          </Link>
        </div>
      </div>
    );
  }

  return (
    <CampaignDetailClient
      campaign={campaign}
      initialSubmissions={initialSubmissions}
    />
  );
}
