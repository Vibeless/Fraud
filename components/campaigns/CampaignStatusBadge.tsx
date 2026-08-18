import React from 'react';
import { CampaignStatus } from '@/lib/api-client/campaigns';

export interface CampaignStatusBadgeProps {
  status?: CampaignStatus | string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

interface StatusConfig {
  label: string;
  badgeClass: string;
  dotClass: string;
  icon: (className?: string) => React.ReactNode;
}

const STATUS_CONFIG: Record<CampaignStatus, StatusConfig> = {
  draft: {
    label: 'Draft',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    dotClass: 'bg-slate-400',
    icon: (className = 'w-3 h-3') => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
      </svg>
    ),
  },
  active: {
    label: 'Active',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    dotClass: 'bg-emerald-500',
    icon: (className = 'w-3 h-3') => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
      </svg>
    ),
  },
  closed: {
    label: 'Closed',
    badgeClass: 'bg-zinc-100 text-zinc-700 border-zinc-300',
    dotClass: 'bg-zinc-500',
    icon: (className = 'w-3 h-3') => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
      </svg>
    ),
  },
};

/**
 * Single source of truth for mapping Campaign status to visual badges per DUXS §4.4 & FFS §3.
 * Follows the same isolation principle established for RiskScoreBadge.
 */
export function CampaignStatusBadge({
  status,
  size = 'md',
  className = '',
}: CampaignStatusBadgeProps) {
  if (!status) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200 ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
        <span>Unknown</span>
      </span>
    );
  }

  const normalizedStatus = (status.toLowerCase() as CampaignStatus) in STATUS_CONFIG
    ? (status.toLowerCase() as CampaignStatus)
    : null;

  if (!normalizedStatus) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 ${className}`}>
        <span>{status}</span>
      </span>
    );
  }

  const config = STATUS_CONFIG[normalizedStatus];

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1 font-medium',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3 py-1.5 gap-2 font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border shadow-sm ${config.badgeClass} ${sizeClasses[size]} ${className}`}
      role="status"
      aria-label={`Campaign Status: ${config.label}`}
    >
      <span className="flex-shrink-0" aria-hidden="true">
        {config.icon(size === 'lg' ? 'w-4 h-4' : 'w-3 h-3')}
      </span>
      <span>{config.label}</span>
    </span>
  );
}
