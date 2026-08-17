'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  listSubmissions,
  getSubmission,
  Submission,
  ListSubmissionsParams,
  PaginatedSubmissionsResponse,
} from '@/lib/api-client/submissions';

const DEFAULT_POLL_INTERVAL_MS = 5000;

export interface UseSubmissionsOptions {
  initialData?: PaginatedSubmissionsResponse | null;
  initialFilters?: ListSubmissionsParams;
}

export function useSubmissions(options: UseSubmissionsOptions = {}) {
  const [submissions, setSubmissions] = useState<Submission[]>(
    options.initialData?.data || []
  );
  const [totalCount, setTotalCount] = useState<number>(
    options.initialData?.pagination.total || 0
  );
  const [filters, setFilters] = useState<ListSubmissionsParams>(
    options.initialFilters || { page: 1, pageSize: 25 }
  );
  const [isLoading, setIsLoading] = useState<boolean>(!options.initialData);
  const [error, setError] = useState<Error | null>(null);

  const pollIntervalMs =
    Number(process.env.NEXT_PUBLIC_SUBMISSIONS_POLL_INTERVAL_MS) ||
    DEFAULT_POLL_INTERVAL_MS;

  const fetchSubmissions = useCallback(async (currentFilters: ListSubmissionsParams) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await listSubmissions(currentFilters);
      setSubmissions(res.data);
      setTotalCount(res.pagination.total);
    } catch (err: unknown) {
      setError(err instanceof Error ? err : new Error('Failed to load submissions'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update on filter changes
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      if (!options.initialData) {
        fetchSubmissions(filters);
      }
      return;
    }
    fetchSubmissions(filters);
  }, [filters, fetchSubmissions, options.initialData]);

  // Targeted polling ONLY for active rows (status=analyzing or queued)
  useEffect(() => {
    const activeSubmissions = submissions.filter(
      (s) => s.status === 'analyzing' || s.status === 'validating' || s.status === 'queued'
    );

    if (activeSubmissions.length === 0) {
      return;
    }

    const intervalId = setInterval(async () => {
      try {
        const updatedItems = await Promise.all(
          activeSubmissions.map(async (item) => {
            try {
              return await getSubmission(item.id);
            } catch {
              return item;
            }
          })
        );

        setSubmissions((prevList) =>
          prevList.map((prev) => {
            const updated = updatedItems.find((u) => u.id === prev.id);
            return updated || prev;
          })
        );
      } catch {
        // Suppress background poll errors
      }
    }, pollIntervalMs);

    return () => clearInterval(intervalId);
  }, [submissions, pollIntervalMs]);

  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  const handleFilterChange = (newFilters: ListSubmissionsParams) => {
    setFilters(newFilters);
  };

  const handleResetFilters = () => {
    setFilters({ page: 1, pageSize: filters.pageSize || 25 });
  };

  const refresh = () => {
    fetchSubmissions(filters);
  };

  return {
    submissions,
    totalCount,
    filters,
    isLoading,
    error,
    setFilters: handleFilterChange,
    resetFilters: handleResetFilters,
    setPage: handlePageChange,
    refresh,
  };
}
