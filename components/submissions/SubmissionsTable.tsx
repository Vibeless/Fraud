'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Submission, EvidenceItem, getLatestAnalysis } from '@/lib/api-client/submissions';
import { RiskScoreBadge } from '@/components/risk/RiskScoreBadge';
import { Button } from '@/components/ui/Button';

export interface SubmissionsTableProps {
  submissions: Submission[];
  totalCount: number;
  page: number;
  pageSize: number;
  isLoading?: boolean;
  onPageChange: (newPage: number) => void;
  onOpenSubmitModal?: () => void;
  onRetrySubmission?: (submissionId: string) => void;
}

function parseCreatorHandle(postUrl: string): string {
  try {
    const match = postUrl.match(/(?:x\.com|twitter\.com)\/([^/]+)\/status/i);
    return match ? `@${match[1]}` : '@creator';
  } catch {
    return '@creator';
  }
}

function parsePostId(postUrl: string): string {
  try {
    const match = postUrl.match(/\/status\/(\d+)/i);
    return match ? match[1] : '';
  } catch {
    return '';
  }
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return dateStr;
  }
}

export function SubmissionsTable({
  submissions,
  totalCount,
  page,
  pageSize,
  isLoading = false,
  onPageChange,
  onOpenSubmitModal,
  onRetrySubmission,
}: SubmissionsTableProps) {
  const router = useRouter();
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const [evidenceCache, setEvidenceCache] = useState<Record<string, EvidenceItem[]>>({});
  const [loadingEvidence, setLoadingEvidence] = useState<Record<string, boolean>>({});

  // Quick-evidence on-demand fetch on hover (since list response does not embed full evidence)
  const handleMouseEnter = async (submission: Submission) => {
    setHoveredRowId(submission.id);

    if (submission.status !== 'completed' || evidenceCache[submission.id] || loadingEvidence[submission.id]) {
      return;
    }

    setLoadingEvidence((prev) => ({ ...prev, [submission.id]: true }));
    try {
      const analysis = await getLatestAnalysis(submission.id);
      setEvidenceCache((prev) => ({
        ...prev,
        [submission.id]: analysis.evidence?.slice(0, 2) || [],
      }));
    } catch {
      // Gracefully ignore tooltip fetch failure
    } finally {
      setLoadingEvidence((prev) => ({ ...prev, [submission.id]: false }));
    }
  };

  const handleMouseLeave = () => {
    setHoveredRowId(null);
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  if (!isLoading && submissions.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
        <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-slate-900">No submissions yet</h3>
        <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
          Submit your first X post to start analyzing engagement integrity and fraud signals.
        </p>
        {onOpenSubmitModal && (
          <div className="mt-6">
            <Button variant="primary" onClick={onOpenSubmitModal}>
              Submit a Post
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
              <span>Loading submissions…</span>
            </div>
          </div>
        )}

        <table className="min-w-full divide-y divide-slate-200 text-left text-xs" role="table">
          <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold">
            <tr>
              <th scope="col" className="py-3.5 pl-6 pr-3">Creator</th>
              <th scope="col" className="px-3 py-3.5">Post Preview</th>
              <th scope="col" className="px-3 py-3.5">Campaign</th>
              <th scope="col" className="px-3 py-3.5">Risk Level</th>
              <th scope="col" className="px-3 py-3.5">Status</th>
              <th scope="col" className="px-3 py-3.5">Submitted</th>
              <th scope="col" className="relative py-3.5 pl-3 pr-6 text-right">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white text-slate-700">
            {submissions.map((submission) => {
              const handle = parseCreatorHandle(submission.postUrl);
              const postId = parsePostId(submission.postUrl);
              const isAnalyzing = submission.status === 'analyzing' || submission.status === 'validating';
              const isFailed = submission.status === 'failed';
              const isQueued = submission.status === 'queued' || submission.status === 'pending';

              return (
                <tr
                  key={submission.id}
                  onClick={() => router.push(`/submissions/${submission.id}`)}
                  onMouseEnter={() => handleMouseEnter(submission)}
                  onMouseLeave={handleMouseLeave}
                  className="hover:bg-slate-50/80 cursor-pointer transition-colors relative group"
                >
                  {/* Creator Column */}
                  <td className="py-4 pl-6 pr-3 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 flex-shrink-0">
                        {handle.slice(1, 3).toUpperCase()}
                      </div>
                      <div className="font-medium text-slate-900">{handle}</div>
                    </div>
                  </td>

                  {/* Post Preview Snippet */}
                  <td className="px-3 py-4 max-w-[200px] truncate text-slate-500">
                    <span className="truncate font-mono text-xs text-slate-600 block">
                      status/{postId || submission.id.slice(0, 8)}
                    </span>
                  </td>

                  {/* Campaign Column */}
                  <td className="px-3 py-4 whitespace-nowrap text-slate-500">
                    {submission.campaignId ? (
                      <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                        {submission.campaignId.slice(0, 8)}…
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">—</span>
                    )}
                  </td>

                  {/* Risk Level & Score */}
                  <td className="px-3 py-4 whitespace-nowrap relative">
                    {isAnalyzing ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                        <span>Analyzing…</span>
                      </span>
                    ) : isQueued ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        <span>Queued</span>
                      </span>
                    ) : isFailed ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                        <span>Failed</span>
                      </span>
                    ) : (
                      <div className="relative inline-block">
                        <RiskScoreBadge
                          riskLevel={submission.riskLevel}
                          riskScore={submission.riskScore}
                          size="sm"
                        />

                        {/* Quick Evidence Tooltip */}
                        {hoveredRowId === submission.id && evidenceCache[submission.id] && evidenceCache[submission.id].length > 0 && (
                          <div className="absolute left-0 bottom-full mb-2 w-72 p-3 bg-slate-900 text-white rounded-lg shadow-xl text-xs z-30 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                            <div className="font-semibold text-slate-200 mb-1 flex items-center justify-between">
                              <span>Quick Evidence</span>
                              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Top Findings</span>
                            </div>
                            <ul className="space-y-1.5 text-slate-300">
                              {evidenceCache[submission.id].map((ev, idx) => (
                                <li key={idx} className="flex items-start gap-1.5 text-[11px] leading-tight">
                                  <span className="text-amber-400 mt-0.5">•</span>
                                  <span>{ev.summary}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Status Column */}
                  <td className="px-3 py-4 whitespace-nowrap">
                    <span className="capitalize text-slate-600 font-medium">
                      {submission.status}
                    </span>
                    {isFailed && submission.failureReason && (
                      <span className="block text-[10px] text-red-500 truncate max-w-[150px]" title={submission.failureReason}>
                        {submission.failureReason}
                      </span>
                    )}
                  </td>

                  {/* Submitted Date */}
                  <td className="px-3 py-4 whitespace-nowrap text-slate-500">
                    {formatDate(submission.createdAt)}
                  </td>

                  {/* Row Actions */}
                  <td className="py-4 pl-3 pr-6 text-right whitespace-nowrap">
                    {isFailed && onRetrySubmission ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRetrySubmission(submission.id);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                        <span>Retry</span>
                      </button>
                    ) : (
                      <Link
                        href={`/submissions/${submission.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-slate-400 group-hover:text-slate-700 transition-colors"
                        aria-label={`View submission ${submission.id}`}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                        </svg>
                      </Link>
                    )}
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
          Showing <span className="font-semibold text-slate-700">{submissions.length > 0 ? (page - 1) * pageSize + 1 : 0}</span> to{' '}
          <span className="font-semibold text-slate-700">{Math.min(page * pageSize, totalCount)}</span> of{' '}
          <span className="font-semibold text-slate-700">{totalCount}</span> submissions
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
