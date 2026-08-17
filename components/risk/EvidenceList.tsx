import React from 'react';
import { EvidenceItem } from '@/lib/api-client/submissions';

export interface EvidenceListProps {
  evidence: EvidenceItem[];
  className?: string;
}

// Category icons per DUXS §4.3
function PostCategoryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  );
}

function AccountCategoryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

function EngagementCategoryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  );
}

function AudienceCategoryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
    </svg>
  );
}

function BehaviorCategoryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" />
    </svg>
  );
}

function renderCategoryIcon(category: string, className = 'w-4 h-4') {
  const norm = category.toLowerCase().trim();
  if (norm.includes('account')) return <AccountCategoryIcon className={className} />;
  if (norm.includes('engagement') || norm.includes('timing')) return <EngagementCategoryIcon className={className} />;
  if (norm.includes('audience') || norm.includes('follower')) return <AudienceCategoryIcon className={className} />;
  if (norm.includes('behavior') || norm.includes('bot') || norm.includes('pattern')) return <BehaviorCategoryIcon className={className} />;
  return <PostCategoryIcon className={className} />;
}

function formatCategoryLabel(category: string): string {
  const norm = category.toLowerCase().trim();
  if (norm.includes('account')) return 'Account';
  if (norm.includes('engagement')) return 'Engagement';
  if (norm.includes('timing')) return 'Timing';
  if (norm.includes('audience')) return 'Audience';
  if (norm.includes('behavior')) return 'Behavior';
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function renderSeverityBadge(severity: string) {
  const norm = severity.toLowerCase().trim();
  switch (norm) {
    case 'critical':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-red-100 text-red-800 border border-red-200">
          Critical
        </span>
      );
    case 'high':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-orange-100 text-orange-800 border border-orange-200">
          High
        </span>
      );
    case 'medium':
    case 'moderate':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
          Medium
        </span>
      );
    case 'low':
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          Low
        </span>
      );
  }
}

/**
 * Renders the ordered evidence list per DUXS §4.3 and FFS §3.
 *
 * NOTE: Sourced directly from Finding.summary (RLS §10).
 * Never exposes internal scoring weights, confidence values, or threshold formulas (DES §9).
 * Semantic <ul> / <li> structure for screen-reader accessibility per DUXS §6.
 */
export function EvidenceList({ evidence, className = '' }: EvidenceListProps) {
  if (!evidence || evidence.length === 0) {
    return (
      <div className={`p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-sm ${className}`}>
        <p className="font-medium text-slate-700">No anomalous evidence identified</p>
        <p className="mt-1 text-xs text-slate-500">
          The detection engine did not flag any suspicious engagement or creator patterns for this submission.
        </p>
      </div>
    );
  }

  return (
    <ul
      role="list"
      className={`divide-y divide-slate-100 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden ${className}`}
      aria-label="Detection Evidence Findings"
    >
      {evidence.map((item, index) => (
        <li
          key={`${item.category}-${index}`}
          className="p-4 sm:p-5 hover:bg-slate-50/60 transition-colors flex items-start gap-4"
        >
          {/* Category Icon Container */}
          <div
            className="h-9 w-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5 border border-slate-200"
            title={`Category: ${formatCategoryLabel(item.category)}`}
          >
            {renderCategoryIcon(item.category, 'w-5 h-5')}
          </div>

          {/* Evidence Details */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                {formatCategoryLabel(item.category)}
              </span>
              {renderSeverityBadge(item.severity)}
            </div>

            {/* Plain-Language Summary Sentence */}
            <p className="text-sm text-slate-900 leading-relaxed">
              {item.summary}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
