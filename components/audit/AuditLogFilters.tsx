'use client';

import React from 'react';
import { ListAuditLogsParams } from '@/lib/api-client/audit';

export interface AuditLogFiltersProps {
  filters: ListAuditLogsParams;
  isPlatformAdmin?: boolean;
  onChange: (newFilters: ListAuditLogsParams) => void;
  onReset: () => void;
}

const COMMON_ACTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'campaign.created', label: 'campaign.created' },
  { value: 'campaign.activated', label: 'campaign.activated' },
  { value: 'campaign.closed', label: 'campaign.closed' },
  { value: 'campaign.reopened', label: 'campaign.reopened' },
  { value: 'campaign.analyzed', label: 'campaign.analyzed' },
  { value: 'submission.created', label: 'submission.created' },
  { value: 'submission.reviewed', label: 'submission.reviewed' },
  { value: 'api_key.created', label: 'api_key.created' },
  { value: 'api_key.revoked', label: 'api_key.revoked' },
  { value: 'auth.login', label: 'auth.login' },
  { value: 'user.created', label: 'user.created' },
];

export function AuditLogFilters({
  filters,
  isPlatformAdmin = false,
  onChange,
  onReset,
}: AuditLogFiltersProps) {
  const handleActionChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    onChange({
      ...filters,
      action: e.target.value || undefined,
      page: 1,
    });
  };

  const handleActorIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...filters,
      actorId: e.target.value.trim() || undefined,
      page: 1,
    });
  };

  const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...filters,
      dateFrom: e.target.value ? new Date(e.target.value).toISOString() : undefined,
      page: 1,
    });
  };

  const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...filters,
      dateTo: e.target.value ? new Date(e.target.value).toISOString() : undefined,
      page: 1,
    });
  };

  const handleAgencyIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...filters,
      agencyId: e.target.value.trim() || undefined,
      page: 1,
    });
  };

  const toInputDateValue = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toISOString().slice(0, 10);
    } catch {
      return '';
    }
  };

  const hasActiveFilters = Boolean(
    filters.action ||
    filters.actorId ||
    filters.dateFrom ||
    filters.dateTo ||
    (isPlatformAdmin && filters.agencyId)
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4">
      {/* Platform Admin Agency Notice & Input */}
      {isPlatformAdmin && (
        <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-200 text-amber-900 text-xs font-bold">
              !
            </span>
            <span className="text-xs font-semibold text-amber-900">
              Platform Admin Scope
            </span>
          </div>
          <p className="text-xs text-amber-800">
            Platform admins must specify a target <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">agencyId</code> to query scoped audit events.
          </p>
          <div className="pt-1">
            <label htmlFor="agency-id-filter" className="block text-xs font-medium text-slate-700 mb-1">
              Target Agency UUID <span className="text-red-500">*</span>
            </label>
            <input
              id="agency-id-filter"
              type="text"
              placeholder="e.g. 00000000-0000-0000-0000-000000000000"
              value={filters.agencyId || ''}
              onChange={handleAgencyIdChange}
              className="block w-full max-w-md rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 font-mono"
            />
          </div>
        </div>
      )}

      {/* Main Filter Controls Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Action Type Filter */}
        <div>
          <label htmlFor="action-filter" className="block text-xs font-medium text-slate-700 mb-1">
            Action Type
          </label>
          <select
            id="action-filter"
            value={filters.action || ''}
            onChange={handleActionChange}
            className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            {COMMON_ACTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Actor UUID Filter */}
        <div>
          <label htmlFor="actor-id-filter" className="block text-xs font-medium text-slate-700 mb-1">
            Actor UUID
          </label>
          <input
            id="actor-id-filter"
            type="text"
            placeholder="Filter by Actor UUID…"
            value={filters.actorId || ''}
            onChange={handleActorIdChange}
            className="block w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 font-mono"
          />
        </div>

        {/* Date From */}
        <div>
          <label htmlFor="date-from-filter" className="block text-xs font-medium text-slate-700 mb-1">
            Date From
          </label>
          <input
            id="date-from-filter"
            type="date"
            value={toInputDateValue(filters.dateFrom)}
            onChange={handleDateFromChange}
            className="block w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>

        {/* Date To */}
        <div>
          <label htmlFor="date-to-filter" className="block text-xs font-medium text-slate-700 mb-1">
            Date To
          </label>
          <input
            id="date-to-filter"
            type="date"
            value={toInputDateValue(filters.dateTo)}
            onChange={handleDateToChange}
            className="block w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>
      </div>

      {/* Reset Filter Action Bar */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
          <span className="text-slate-500">
            Active filters applied
          </span>
          <button
            type="button"
            onClick={onReset}
            className="text-xs text-slate-600 hover:text-slate-900 font-medium underline underline-offset-2 transition-colors"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
