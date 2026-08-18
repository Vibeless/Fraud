'use client';

import React from 'react';
import { CampaignStatus, ListCampaignsParams } from '@/lib/api-client/campaigns';

export interface CampaignFiltersProps {
  filters: ListCampaignsParams & { search?: string };
  onChange: (newFilters: ListCampaignsParams & { search?: string }) => void;
  onReset: () => void;
}

const STATUS_FILTER_OPTIONS: Array<{ value: CampaignStatus | ''; label: string; dotColor: string }> = [
  { value: '', label: 'All Statuses', dotColor: 'bg-slate-400' },
  { value: 'draft', label: 'Draft', dotColor: 'bg-slate-400' },
  { value: 'active', label: 'Active', dotColor: 'bg-emerald-500' },
  { value: 'closed', label: 'Closed', dotColor: 'bg-zinc-500' },
];

export function CampaignFilters({
  filters,
  onChange,
  onReset,
}: CampaignFiltersProps) {
  const handleStatusChange = (status: CampaignStatus | '') => {
    onChange({
      ...filters,
      status: status || undefined,
      page: 1,
    });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...filters,
      search: e.target.value || undefined,
      page: 1,
    });
  };

  const hasActiveFilters = Boolean(filters.status || filters.search);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search by Campaign Name or External ID */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search campaigns by name or ID…"
              value={filters.search || ''}
              onChange={handleSearchChange}
              className="block w-full rounded-lg border border-slate-300 pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>
        </div>

        {/* Status Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-slate-500 mr-1">Status:</span>
          {STATUS_FILTER_OPTIONS.map((opt) => {
            const isSelected = (filters.status || '') === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleStatusChange(opt.value)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
                aria-pressed={isSelected}
              >
                <span className={`w-2 h-2 rounded-full ${opt.dotColor}`} aria-hidden="true" />
                <span>{opt.label}</span>
              </button>
            );
          })}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onReset}
              className="text-xs text-slate-500 hover:text-slate-900 underline underline-offset-2 ml-2 transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
