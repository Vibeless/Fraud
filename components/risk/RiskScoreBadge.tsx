import React from 'react';

export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';

export interface RiskScoreBadgeProps {
  riskLevel?: RiskLevel | string | null;
  riskScore?: number | null;
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
  className?: string;
}

interface RiskLevelConfig {
  label: string;
  badgeClass: string;
  dotClass: string;
  icon: (className?: string) => React.ReactNode;
}

const RISK_CONFIG: Record<RiskLevel, RiskLevelConfig> = {
  low: {
    label: 'Low Risk',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    dotClass: 'bg-emerald-500',
    icon: (className = 'w-3 h-3') => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
      </svg>
    ),
  },
  moderate: {
    label: 'Moderate Risk',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    dotClass: 'bg-amber-500',
    icon: (className = 'w-3 h-3') => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
      </svg>
    ),
  },
  high: {
    label: 'High Risk',
    badgeClass: 'bg-orange-50 text-orange-800 border-orange-200',
    dotClass: 'bg-orange-500',
    icon: (className = 'w-3 h-3') => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
      </svg>
    ),
  },
  critical: {
    label: 'Critical Risk',
    badgeClass: 'bg-red-50 text-red-800 border-red-200',
    dotClass: 'bg-red-600',
    icon: (className = 'w-3 h-3') => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.007v.008H12v-.008ZM2.25 12a9.75 9.75 0 1 1 19.5 0 9.75 9.75 0 0 1-19.5 0Z" />
      </svg>
    ),
  },
};

/**
 * Single source of truth for mapping riskLevel and riskScore to design tokens per DUXS §5.
 * Never conveys risk by color alone (DUXS §6).
 */
export function RiskScoreBadge({
  riskLevel,
  riskScore,
  size = 'md',
  showScore = true,
  className = '',
}: RiskScoreBadgeProps) {
  if (!riskLevel) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200 ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
        <span>Unscored</span>
      </span>
    );
  }

  const normalizedLevel = (riskLevel.toLowerCase() as RiskLevel) in RISK_CONFIG
    ? (riskLevel.toLowerCase() as RiskLevel)
    : null;

  if (!normalizedLevel) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 ${className}`}>
        <span>{riskLevel}</span>
      </span>
    );
  }

  const config = RISK_CONFIG[normalizedLevel];

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3 py-1.5 gap-2 font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border shadow-sm ${config.badgeClass} ${sizeClasses[size]} ${className}`}
      role="status"
      aria-label={`${config.label}${riskScore !== null && riskScore !== undefined ? ` (Score: ${riskScore})` : ''}`}
    >
      <span className="flex-shrink-0" aria-hidden="true">
        {config.icon(size === 'lg' ? 'w-4 h-4' : 'w-3 h-3')}
      </span>
      <span>{config.label}</span>
      {showScore && riskScore !== null && riskScore !== undefined && (
        <span className="font-bold tabular-nums pl-1 border-l border-current/20">
          {riskScore}
        </span>
      )}
    </span>
  );
}
