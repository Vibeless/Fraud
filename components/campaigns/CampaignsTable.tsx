'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Campaign } from '@/lib/api-client/campaigns';
import { CampaignStatusBadge } from '@/components/campaigns/CampaignStatusBadge';
import { Button } from '@/components/ui/Button';

export interface CampaignsTableProps {
  campaigns: Campaign[];
  totalCount: number;
  page: number;
  pageSize: number;
  isLoading?: boolean;
  canManageCampaigns: boolean;
  actionLoadingId?: string | null;
  onPageChange: (newPage: number) => void;
  onOpenCreateModal?: () => void;
  onActivateCampaign?: (campaign: Campaign) => void;
  onTriggerCloseModal?: (campaign: Campaign) => void;
  onTriggerReopenModal?: (campaign: Campaign) => void;
  onAnalyzeCampaign?: (campaign: Campaign) => void;
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return dateStr;
  }
}

export function CampaignsTable({
  campaigns,
  totalCount,
  page,
  pageSize,
  isLoading = false,
  canManageCampaigns,
  actionLoadingId = null,
  onPageChange,
  onOpenCreateModal,
  onActivateCampaign,
  onTriggerCloseModal,
  onTriggerReopenModal,
  onAnalyzeCampaign,
}: CampaignsTableProps) {
  const router = useRouter();
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  if (!isLoading && campaigns.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
        <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-slate-900">No campaigns found</h3>
        <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
          Create a campaign to organize submissions and monitor group fraud signals.
        </p>
        {canManageCampaigns && onOpenCreateModal && (
          <div className="mt-6">
            <Button variant="primary" onClick={onOpenCreateModal}>
              Create Campaign
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Table Container */}
      <div className="overflow-x-auto min-h-[300px] relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-medium shadow-md">
              <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Loading campaigns…</span>
            </div>
          </div>
        )}

        <table className="min-w-full divide-y divide-slate-200 text-left text-xs" role="table">
          <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold">
            <tr>
              <th scope="col" className="py-3.5 pl-6 pr-3">Campaign Name</th>
              <th scope="col" className="px-3 py-3.5">External ID</th>
              <th scope="col" className="px-3 py-3.5">Status</th>
              <th scope="col" className="px-3 py-3.5">
                <span className="inline-flex items-center gap-1" title="Backend aggregate field not provided in current GET /v1/campaigns endpoint">
                  <span>Submissions</span>
                  <span className="text-[10px] text-slate-400 font-normal lowercase">(api gap)</span>
                </span>
              </th>
              <th scope="col" className="px-3 py-3.5">
                <span className="inline-flex items-center gap-1" title="Backend aggregate field not provided in current GET /v1/campaigns endpoint">
                  <span>Avg Risk Score</span>
                  <span className="text-[10px] text-slate-400 font-normal lowercase">(api gap)</span>
                </span>
              </th>
              <th scope="col" className="px-3 py-3.5">Created</th>
              <th scope="col" className="relative py-3.5 pl-3 pr-6 text-right">
                <span>Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white text-slate-700">
            {campaigns.map((campaign) => {
              const isActionRunning = actionLoadingId === campaign.id;

              return (
                <tr
                  key={campaign.id}
                  onClick={() => router.push(`/campaigns/${campaign.id}`)}
                  className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                >
                  {/* Campaign Name */}
                  <td className="py-4 pl-6 pr-3 whitespace-nowrap">
                    <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {campaign.name}
                    </div>
                    <div className="font-mono text-[11px] text-slate-400">
                      {campaign.id}
                    </div>
                  </td>

                  {/* External ID */}
                  <td className="px-3 py-4 whitespace-nowrap text-slate-600">
                    {campaign.externalCampaignId ? (
                      <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-800 border border-slate-200">
                        {campaign.externalCampaignId}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">—</span>
                    )}
                  </td>

                  {/* Status Badge */}
                  <td className="px-3 py-4 whitespace-nowrap">
                    <CampaignStatusBadge status={campaign.status} size="sm" />
                  </td>

                  {/* Submission Count (Backend Gap Placeholder) */}
                  <td className="px-3 py-4 whitespace-nowrap text-slate-400">
                    <span
                      className="inline-flex items-center gap-1 text-slate-400 italic cursor-help"
                      title="Aggregate submission count is not returned by the current GET /v1/campaigns endpoint."
                    >
                      <span>—</span>
                      <span className="text-[10px] text-slate-400 border border-dashed border-slate-300 rounded px-1">n/a</span>
                    </span>
                  </td>

                  {/* Avg Risk Score (Backend Gap Placeholder) */}
                  <td className="px-3 py-4 whitespace-nowrap text-slate-400">
                    <span
                      className="inline-flex items-center gap-1 text-slate-400 italic cursor-help"
                      title="Aggregate average risk score is not returned by the current GET /v1/campaigns endpoint."
                    >
                      <span>—</span>
                      <span className="text-[10px] text-slate-400 border border-dashed border-slate-300 rounded px-1">n/a</span>
                    </span>
                  </td>

                  {/* Created Date */}
                  <td className="px-3 py-4 whitespace-nowrap text-slate-500">
                    {formatDate(campaign.createdAt)}
                  </td>

                  {/* Actions Column */}
                  <td className="py-4 pl-3 pr-6 text-right whitespace-nowrap">
                    <div
                      className="inline-flex items-center gap-2 justify-end"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Lifecycle Action Buttons (Visible for permitted roles only) */}
                      {canManageCampaigns && (
                        <>
                          {/* Draft: Activate Action */}
                          {campaign.status === 'draft' && onActivateCampaign && (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              isLoading={isActionRunning}
                              disabled={isActionRunning}
                              onClick={() => onActivateCampaign(campaign)}
                              className="text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                            >
                              <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                              </svg>
                              Activate
                            </Button>
                          )}

                          {/* Active: Analyze Now Action */}
                          {campaign.status === 'active' && onAnalyzeCampaign && (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              isLoading={isActionRunning}
                              disabled={isActionRunning}
                              onClick={() => onAnalyzeCampaign(campaign)}
                              className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                              title="Run manual campaign-level integrity analysis"
                            >
                              <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                              </svg>
                              Analyze
                            </Button>
                          )}

                          {/* Active: Close Action */}
                          {campaign.status === 'active' && onTriggerCloseModal && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={isActionRunning}
                              onClick={() => onTriggerCloseModal(campaign)}
                              className="text-xs text-amber-700 border-amber-300 hover:bg-amber-50"
                              title="Close campaign and run final analysis"
                            >
                              <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                              </svg>
                              Close
                            </Button>
                          )}

                          {/* Closed: Reopen Action */}
                          {campaign.status === 'closed' && onTriggerReopenModal && (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              disabled={isActionRunning}
                              onClick={() => onTriggerReopenModal(campaign)}
                              className="text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300"
                              title="Reopen campaign for new submissions"
                            >
                              <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                              </svg>
                              Reopen
                            </Button>
                          )}
                        </>
                      )}

                      {/* Detail Link */}
                      <Link
                        href={`/campaigns/${campaign.id}`}
                        className="inline-flex items-center text-slate-400 group-hover:text-slate-700 transition-colors p-1.5 rounded hover:bg-slate-100"
                        aria-label={`View details for ${campaign.name}`}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                        </svg>
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
        <div>
          Showing <span className="font-semibold text-slate-700">{campaigns.length > 0 ? (page - 1) * pageSize + 1 : 0}</span> to{' '}
          <span className="font-semibold text-slate-700">{Math.min(page * pageSize, totalCount)}</span> of{' '}
          <span className="font-semibold text-slate-700">{totalCount}</span> campaigns
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1 || isLoading}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </Button>
          <span className="px-2 font-medium text-slate-700">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= totalPages || isLoading}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
