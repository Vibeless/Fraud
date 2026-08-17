'use client';

import React from 'react';
import { ListSubmissionsParams, RiskLevel, SubmissionStatus } from '@/lib/api-client/submissions';

export interface SubmissionFiltersProps {
  filters: ListSubmissionsParams;
  onChange: (newFilters: ListSubmissionsParams) => void;
  onReset: () => void;
}

const RISK_LEVELS: Array<{ value: RiskLevel; label: string; dotColor: string }> = [
  { value: 'low', label: 'Low', dotColor: 'bg-emerald-500' },
  { value: 'moderate', label: 'Moderate', dotColor: 'bg-amber-500' },
  { value: 'high', label: 'High', dotColor: 'bg-orange-500' },
  { value: 'critical', label: 'Critical', dotColor: 'bg-red-500' },
];

const STATUS_OPTIONS: Array<{ value: SubmissionStatus | ''; label: string }> = [
  { value: '', label: 'All Statuses' },
  { value: 'queued', label: 'Queued' },
  { value: 'analyzing', label: 'Analyzing' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
];

export function SubmissionFilters({
  filters,
  onChange,
  onReset,
}: SubmissionFiltersProps) {
  const handleRiskLevelToggle = (level: RiskLevel) => {
    // Single or toggle filter
    const newRiskLevel = filters.riskLevel === level ? undefined : level;
    onChange({
      ...filters,
      riskLevel: newRiskLevel,
      page: 1, // Reset to page 1 on filter change
    });
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const status = e.target.value as SubmissionStatus | '';
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

  const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...filters,
      dateFrom: e.target.value || undefined,
      page: 1,
    });
  };

  const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...filters,
      dateTo: e.target.value || undefined,
      page: 1,
    });
  };

  const hasActiveFilters = Boolean(
    filters.riskLevel ||
    filters.status ||
    filters.search ||
    filters.campaignId ||
    filters.dateFrom ||
    filters.dateTo
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4">
      {/* Search & Top Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search by Post URL or Creator */}
        <div className="lg:col-span-2">
          <label htmlFor="search-input" className="block text-xs font-medium text-slate-600 mb-1">
            Search
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </div>
            <input
              id="search-input"
              type="text"
              placeholder="Search post URL or creator handle…"
              value={filters.search || ''}
              onChange={handleSearchChange}
              className="block w-full rounded-lg border border-slate-300 pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>
        </div>

        {/* Status Dropdown */}
        <div>
          <label htmlFor="status-select" className="block text-xs font-medium text-slate-600 mb-1">
            Status
          </label>
          <select
            id="status-select"
            value={filters.status || ''}
            onChange={handleStatusChange}
            className="block w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 bg-white focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range (From - To) */}
        <div>
          <label htmlFor="date-from" className="block text-xs font-medium text-slate-600 mb-1">
            Date Range
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <input
              id="date-from"
              type="date"
              value={filters.dateFrom || ''}
              onChange={handleDateFromChange}
              className="block w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              title="From date"
            />
            <input
              id="date-to"
              type="date"
              value={filters.dateTo || ''}
              onChange={handleDateToChange}
              className="block w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              title="To date"
            />
          </div>
        </div>
      </div>

      {/* Risk Level Filter Chips */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500 mr-1">Risk Level:</span>
          {RISK_LEVELS.map((level) => {
            const isSelected = filters.riskLevel === level.value;
            return (
              <button
                key={level.value}
                type="button"
                onClick={() => handleRiskLevelToggle(level.value)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
                aria-pressed={isSelected}
              >
                <span className={`w-2 h-2 rounded-full ${level.dotColor}`} aria-hidden="true" />
                <span>{level.label}</span>
              </button>
            );
          })}
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="text-xs text-slate-500 hover:text-slate-900 underline underline-offset-2 transition-colors"
          >
            Clear all filters
          </button>
        )}
      </div>
    </div>
  );
}
