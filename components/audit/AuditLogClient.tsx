'use client';

import React, { useState, useCallback, useEffect, useTransition } from 'react';
import { usePermissions } from '@/lib/hooks/usePermissions';
import {
  AuditLogEntry,
  ListAuditLogsParams,
  ListAuditLogsResponse,
  listAuditLogs,
} from '@/lib/api-client/audit';
import { ApiClientError } from '@/lib/api-client/client';
import { AuditLogTable } from '@/components/audit/AuditLogTable';
import { AuditLogFilters } from '@/components/audit/AuditLogFilters';

export interface AuditLogClientProps {
  initialData?: ListAuditLogsResponse | null;
}

export function AuditLogClient({ initialData }: AuditLogClientProps) {
  const permissions = usePermissions();
  const [, startTransition] = useTransition();

  const isPlatformAdmin = permissions.role === 'platform_admin';

  const [entries, setEntries] = useState<AuditLogEntry[]>(initialData?.data || []);
  const [totalCount, setTotalCount] = useState<number>(initialData?.pagination.total || 0);
  const [filters, setFilters] = useState<ListAuditLogsParams>({
    page: 1,
    pageSize: 25,
  });
  const [isLoading, setIsLoading] = useState<boolean>(!initialData && !isPlatformAdmin);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(
    async (currentFilters: ListAuditLogsParams) => {
      // For platform admin, if no agencyId is provided, do not execute the call to prevent 400
      if (isPlatformAdmin && !currentFilters.agencyId) {
        setEntries([]);
        setTotalCount(0);
        setIsLoading(false);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await listAuditLogs(currentFilters);
        startTransition(() => {
          setEntries(response.data);
          setTotalCount(response.pagination.total);
        });
      } catch (err: unknown) {
        if (err instanceof ApiClientError) {
          setError(err.message);
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Failed to load audit logs.');
        }
        setEntries([]);
        setTotalCount(0);
      } finally {
        setIsLoading(false);
      }
    },
    [isPlatformAdmin]
  );

  // Re-fetch when filters change (skip on mount if initialData was provided)
  const [isInitialMount, setIsInitialMount] = useState(true);
  useEffect(() => {
    if (isInitialMount) {
      setIsInitialMount(false);
      if (!initialData && permissions.canViewAuditLog) {
        fetchLogs(filters);
      }
      return;
    }

    if (permissions.canViewAuditLog) {
      fetchLogs(filters);
    }
  }, [filters, fetchLogs, initialData, isInitialMount, permissions.canViewAuditLog]);

  const handleFilterChange = (newFilters: ListAuditLogsParams) => {
    setFilters(newFilters);
  };

  const handleResetFilters = () => {
    setFilters({
      page: 1,
      pageSize: 25,
      agencyId: isPlatformAdmin ? filters.agencyId : undefined,
    });
  };

  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({
      ...prev,
      page: newPage,
    }));
  };

  // RBAC Access Guard (AAD §5.2): Gated for campaign_manager & viewer
  if (!permissions.loading && !permissions.canViewAuditLog) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Audit Log
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Immutable log of security-relevant and operational events (FR-010).
          </p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center max-w-2xl mx-auto shadow-sm">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-3">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-red-900">Access Denied</h2>
          <p className="mt-1 text-sm text-red-700">
            Your role (<span className="font-mono font-medium">{permissions.role || 'unauthenticated'}</span>) is not authorized to view the audit log.
          </p>
          <p className="mt-2 text-xs text-red-500">
            Per AAD §5.2, audit log access is restricted to Platform Admins, Agency Admins, and Fraud Reviewers.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Audit Log
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Read-only feed of security, authentication, campaign, and submission lifecycle events.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200 self-start sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Append-Only Trail</span>
        </div>
      </div>

      {/* Backend Gap Notice Banner */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-start gap-2.5">
        <svg className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
        </svg>
        <div>
          <span className="font-semibold text-slate-700">Audit Trail Fidelity:</span> Actors and resources are displayed directly with their system identifiers and types. (Backend endpoint does not perform client-side identity joins).
        </div>
      </div>

      {/* Error notification */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => fetchLogs(filters)}
            className="font-medium underline hover:text-red-900 ml-3"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <AuditLogFilters
        filters={filters}
        isPlatformAdmin={isPlatformAdmin}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      {/* Platform Admin prompt when no agency is selected */}
      {isPlatformAdmin && !filters.agencyId && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-sm">
          <div className="mx-auto h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mb-3">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-slate-900">Agency Selection Required</h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            Please enter a Target Agency UUID in the filters above to load the audit trail for that agency.
          </p>
        </div>
      )}

      {/* Table (rendered when not awaiting platform_admin agencyId) */}
      {(!isPlatformAdmin || Boolean(filters.agencyId)) && (
        <AuditLogTable
          entries={entries}
          totalCount={totalCount}
          page={filters.page || 1}
          pageSize={filters.pageSize || 25}
          isLoading={isLoading}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}
