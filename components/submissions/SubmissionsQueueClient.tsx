'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SubmissionsTable } from '@/components/submissions/SubmissionsTable';
import { SubmissionFilters } from '@/components/submissions/SubmissionFilters';
import { SubmitPostForm } from '@/components/submissions/SubmitPostForm';
import { useSubmissions } from '@/lib/hooks/useSubmissions';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { PaginatedSubmissionsResponse, Submission } from '@/lib/api-client/submissions';

export interface SubmissionsQueueClientProps {
  initialData?: PaginatedSubmissionsResponse | null;
}

export function SubmissionsQueueClient({ initialData }: SubmissionsQueueClientProps) {
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const permissions = usePermissions();

  const {
    submissions,
    totalCount,
    filters,
    isLoading,
    error,
    setFilters,
    resetFilters,
    setPage,
    refresh,
  } = useSubmissions({ initialData });

  const handlePostSubmitted = (_newSubmission: Submission) => {
    refresh();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Submissions Queue
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Triage, filter, and inspect campaign engagement integrity and risk evidence.
          </p>
        </div>

        {/* Submit Post Button (Visible for Campaign Manager, Agency Admin, Platform Admin) */}
        {permissions.canSubmitPost && (
          <Button
            variant="primary"
            onClick={() => setIsSubmitModalOpen(true)}
            className="flex-shrink-0"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Submit a Post
          </Button>
        )}
      </div>

      {/* Error alert if fetch failed */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center justify-between">
          <span>Failed to load submissions: {error.message}</span>
          <Button variant="secondary" size="sm" onClick={refresh}>
            Retry
          </Button>
        </div>
      )}

      {/* Filters Bar */}
      <SubmissionFilters
        filters={filters}
        onChange={setFilters}
        onReset={resetFilters}
      />

      {/* Submissions Table */}
      <SubmissionsTable
        submissions={submissions}
        totalCount={totalCount}
        page={filters.page || 1}
        pageSize={filters.pageSize || 25}
        isLoading={isLoading}
        onPageChange={setPage}
        onOpenSubmitModal={() => setIsSubmitModalOpen(true)}
        onRetrySubmission={() => refresh()}
      />

      {/* Submit Post Modal Dialog */}
      <Modal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        title="Submit an X Post"
        description="Enter an X post URL to queue background engagement fraud and bot detection analysis."
      >
        <SubmitPostForm
          onSuccess={handlePostSubmitted}
          onCancel={() => setIsSubmitModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
