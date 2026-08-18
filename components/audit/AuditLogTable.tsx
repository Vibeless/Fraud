'use client';

import React from 'react';
import { AuditActorType, AuditLogEntry } from '@/lib/api-client/audit';
import { Button } from '@/components/ui/Button';

export interface AuditLogTableProps {
  entries: AuditLogEntry[];
  totalCount: number;
  page: number;
  pageSize: number;
  isLoading?: boolean;
  onPageChange: (newPage: number) => void;
}

function formatDate(dateStr: string): { formatted: string; full: string } {
  try {
    const date = new Date(dateStr);
    const formatted = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(date);
    return { formatted, full: date.toISOString() };
  } catch {
    return { formatted: dateStr, full: dateStr };
  }
}

function truncateId(id: string | null, length = 8): string {
  if (!id) return '—';
  if (id.length <= length) return id;
  return `${id.slice(0, length)}…`;
}

function getActorBadge(actorType: AuditActorType) {
  switch (actorType) {
    case 'user':
      return {
        label: 'User',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
        dotClass: 'bg-blue-500',
      };
    case 'api_key':
      return {
        label: 'API Key',
        badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
        dotClass: 'bg-purple-500',
      };
    case 'system':
      return {
        label: 'System',
        badgeClass: 'bg-zinc-100 text-zinc-700 border-zinc-200',
        dotClass: 'bg-zinc-500',
      };
    default:
      return {
        label: actorType,
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
        dotClass: 'bg-slate-500',
      };
  }
}

function getActionStyle(action: string): string {
  if (action.startsWith('campaign.')) {
    return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  }
  if (action.startsWith('submission.')) {
    return 'bg-indigo-50 text-indigo-800 border-indigo-200';
  }
  if (action.startsWith('api_key.')) {
    return 'bg-amber-50 text-amber-800 border-amber-200';
  }
  if (action.startsWith('auth.') || action.startsWith('user.')) {
    return 'bg-sky-50 text-sky-800 border-sky-200';
  }
  return 'bg-slate-100 text-slate-800 border-slate-200';
}

export function AuditLogTable({
  entries,
  totalCount,
  page,
  pageSize,
  isLoading = false,
  onPageChange,
}: AuditLogTableProps) {
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  if (!isLoading && entries.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
        <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
            />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-slate-900">No audit events found</h3>
        <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
          Audit events are recorded automatically for system operations, campaign changes, and key lifecycles.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Table container */}
      <div className="overflow-x-auto min-h-[300px] relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-medium shadow-md">
              <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Loading audit logs…</span>
            </div>
          </div>
        )}

        <table className="min-w-full divide-y divide-slate-200 text-left text-xs" role="table">
          <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold">
            <tr>
              <th scope="col" className="py-3.5 pl-6 pr-3">Timestamp</th>
              <th scope="col" className="px-3 py-3.5">
                <span className="inline-flex items-center gap-1" title="Actor type and raw UUID (actor resolution is a known backend gap)">
                  <span>Actor</span>
                  <span className="text-[10px] text-slate-400 font-normal lowercase">(type · id)</span>
                </span>
              </th>
              <th scope="col" className="px-3 py-3.5">Action</th>
              <th scope="col" className="px-3 py-3.5">Resource</th>
              <th scope="col" className="py-3.5 pl-3 pr-6 text-right">IP Address</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white text-slate-700">
            {entries.map((entry) => {
              const { formatted, full } = formatDate(entry.createdAt);
              const actorBadge = getActorBadge(entry.actorType);
              const actionStyle = getActionStyle(entry.action);

              return (
                <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                  {/* Timestamp */}
                  <td className="py-4 pl-6 pr-3 whitespace-nowrap">
                    <span className="font-medium text-slate-900" title={full}>
                      {formatted}
                    </span>
                  </td>

                  {/* Actor (type + truncated actorId with raw note) */}
                  <td className="px-3 py-4 whitespace-nowrap">
                    <div className="inline-flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${actorBadge.badgeClass}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${actorBadge.dotClass}`} aria-hidden="true" />
                        {actorBadge.label}
                      </span>
                      {entry.actorLabel ? (
                        <span
                          className="font-medium text-slate-800 text-[11px] cursor-help"
                          title={entry.actorId ? `Actor UUID: ${entry.actorId}` : undefined}
                        >
                          {entry.actorLabel}
                        </span>
                      ) : entry.actorId ? (
                        <span
                          className="font-mono text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 cursor-help"
                          title={`Actor UUID: ${entry.actorId}`}
                        >
                          {truncateId(entry.actorId)}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">—</span>
                      )}
                    </div>
                  </td>

                  {/* Action */}
                  <td className="px-3 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded font-mono text-[11px] font-medium border ${actionStyle}`}
                    >
                      {entry.action}
                    </span>
                  </td>

                  {/* Resource (type · id formatted plainly) */}
                  <td className="px-3 py-4 whitespace-nowrap">
                    {entry.resourceType ? (
                      <div className="inline-flex items-center gap-1.5">
                        <span className="font-medium text-slate-800 capitalize">
                          {entry.resourceType}
                        </span>
                        {entry.resourceId && (
                          <>
                            <span className="text-slate-300">·</span>
                            <span
                              className="font-mono text-[11px] text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200"
                              title={`Resource ID: ${entry.resourceId}`}
                            >
                              {truncateId(entry.resourceId)}
                            </span>
                          </>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">—</span>
                    )}
                  </td>

                  {/* IP Address */}
                  <td className="py-4 pl-3 pr-6 text-right whitespace-nowrap text-slate-500 font-mono text-[11px]">
                    {entry.ipAddress || <span className="text-slate-400 italic">—</span>}
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
          Showing <span className="font-semibold text-slate-700">{entries.length > 0 ? (page - 1) * pageSize + 1 : 0}</span> to{' '}
          <span className="font-semibold text-slate-700">{Math.min(page * pageSize, totalCount)}</span> of{' '}
          <span className="font-semibold text-slate-700">{totalCount}</span> events
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
