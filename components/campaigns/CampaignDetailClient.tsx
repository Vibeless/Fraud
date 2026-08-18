'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  Campaign,
  activateCampaign,
  closeCampaign,
  reopenCampaign,
  analyzeCampaign,
} from '@/lib/api-client/campaigns';
import { PaginatedSubmissionsResponse, Submission } from '@/lib/api-client/submissions';
import { CampaignStatusBadge } from '@/components/campaigns/CampaignStatusBadge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SubmissionsTable } from '@/components/submissions/SubmissionsTable';
import { SubmissionFilters } from '@/components/submissions/SubmissionFilters';
import { SubmitPostForm } from '@/components/submissions/SubmitPostForm';
import { useSubmissions } from '@/lib/hooks/useSubmissions';
import { usePermissions } from '@/lib/hooks/usePermissions';
import {
  CampaignActionConfirmModal,
  LifecycleActionType,
} from '@/components/campaigns/CampaignActionConfirmModal';

export interface CampaignDetailClientProps {
  campaign: Campaign;
  initialSubmissions?: PaginatedSubmissionsResponse | null;
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return dateStr;
  }
}

export function CampaignDetailClient({
  campaign: initialCampaign,
  initialSubmissions,
}: CampaignDetailClientProps) {
  const [campaign, setCampaign] = useState<Campaign>(initialCampaign);
  const permissions = usePermissions();
  const [, startTransition] = useTransition();

  // Submissions queue state pre-filtered to this campaign
  const {
    submissions,
    totalCount,
    filters,
    isLoading: isSubmissionsLoading,
    error: submissionsError,
    setFilters,
    resetFilters,
    setPage,
    refresh: refreshSubmissions,
  } = useSubmissions({
    initialData: initialSubmissions,
    initialFilters: {
      campaignId: campaign.id,
      page: 1,
      pageSize: 25,
    },
  });

  // Action state
  const [isActionRunning, setIsActionRunning] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [actionModalState, setActionModalState] = useState<{
    isOpen: boolean;
    actionType: LifecycleActionType | null;
    isLoading: boolean;
    error: string | null;
  }>({
    isOpen: false,
    actionType: null,
    isLoading: false,
    error: null,
  });

  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Lifecycle Action: Activate
  const handleActivate = async () => {
    try {
      setIsActionRunning(true);
      setNotification(null);

      const updated = await activateCampaign(campaign.id);
      startTransition(() => {
        setCampaign(updated);
      });

      setNotification({
        type: 'success',
        message: `Campaign "${updated.name}" has been activated. Submissions are now accepted.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to activate campaign.';
      setNotification({
        type: 'error',
        message: `Could not activate campaign: ${msg}`,
      });
    } finally {
      setIsActionRunning(false);
    }
  };

  // Lifecycle Action: Analyze
  const handleAnalyze = async () => {
    try {
      setIsActionRunning(true);
      setNotification(null);

      const result = await analyzeCampaign(campaign.id);
      setNotification({
        type: 'success',
        message: `Manual analysis v${result.version} queued (Status: ${result.status}).`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to trigger campaign analysis.';
      setNotification({
        type: 'error',
        message: `Could not trigger analysis: ${msg}`,
      });
    } finally {
      setIsActionRunning(false);
    }
  };

  // Open Confirmation Modal (Close / Reopen)
  const handleOpenActionModal = (actionType: LifecycleActionType) => {
    setActionModalState({
      isOpen: true,
      actionType,
      isLoading: false,
      error: null,
    });
  };

  // Execute Confirmed Modal Action
  const handleConfirmModalAction = async () => {
    const { actionType } = actionModalState;
    if (!actionType) return;

    try {
      setActionModalState((prev) => ({ ...prev, isLoading: true, error: null }));

      let updated: Campaign;
      if (actionType === 'close') {
        updated = await closeCampaign(campaign.id);
      } else {
        updated = await reopenCampaign(campaign.id);
      }

      startTransition(() => {
        setCampaign(updated);
      });

      setActionModalState({
        isOpen: false,
        actionType: null,
        isLoading: false,
        error: null,
      });

      setNotification({
        type: 'success',
        message: actionType === 'close'
          ? `Campaign "${updated.name}" has been closed. Final aggregate analysis queued.`
          : `Campaign "${updated.name}" has been reopened. Submissions are now accepted.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Action failed.';
      setActionModalState((prev) => ({
        ...prev,
        isLoading: false,
        error: msg,
      }));
    }
  };

  const handlePostSubmitted = (_newSubmission: Submission) => {
    refreshSubmissions();
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Navigation */}
      <nav className="flex items-center text-xs text-slate-500 gap-2">
        <Link href="/campaigns" className="hover:text-slate-900 transition-colors flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          <span>Campaigns</span>
        </Link>
        <span>/</span>
        <span className="text-slate-900 font-medium truncate max-w-xs">{campaign.name}</span>
      </nav>

      {/* Campaign Detail Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {campaign.name}
              </h1>
              <CampaignStatusBadge status={campaign.status} size="md" />
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-600">ID:</span>
                <span className="font-mono text-slate-700">{campaign.id}</span>
              </div>

              {campaign.externalCampaignId && (
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-600">External ID:</span>
                  <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-800 border border-slate-200">
                    {campaign.externalCampaignId}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-600">Created:</span>
                <span>{formatDate(campaign.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Lifecycle Action Buttons (RBAC: platform_admin, agency_admin, campaign_manager) */}
          {permissions.canManageCampaigns && (
            <div className="flex flex-wrap items-center gap-2">
              {/* Draft: Activate */}
              {campaign.status === 'draft' && (
                <Button
                  variant="primary"
                  size="sm"
                  isLoading={isActionRunning}
                  disabled={isActionRunning}
                  onClick={handleActivate}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  Activate Campaign
                </Button>
              )}

              {/* Active: Submit Post */}
              {campaign.status === 'active' && permissions.canSubmitPost && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsSubmitModalOpen(true)}
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Submit Post
                </Button>
              )}

              {/* Active: Analyze Now */}
              {campaign.status === 'active' && (
                <Button
                  variant="secondary"
                  size="sm"
                  isLoading={isActionRunning}
                  disabled={isActionRunning}
                  onClick={handleAnalyze}
                  className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                  Analyze Now
                </Button>
              )}

              {/* Active: Close */}
              {campaign.status === 'active' && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isActionRunning}
                  onClick={() => handleOpenActionModal('close')}
                  className="text-amber-700 border-amber-300 hover:bg-amber-50"
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                  </svg>
                  Close Campaign
                </Button>
              )}

              {/* Closed: Reopen */}
              {campaign.status === 'closed' && (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={isActionRunning}
                  onClick={() => handleOpenActionModal('reopen')}
                  className="bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300"
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                  Reopen Campaign
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          className={`p-4 rounded-lg text-sm flex items-start justify-between gap-3 ${
            notification.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
          role="alert"
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <svg className="w-4 h-4 flex-shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            ) : (
              <svg className="w-4 h-4 flex-shrink-0 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
            )}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 text-xs font-medium"
            aria-label="Dismiss notification"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Campaign Submissions Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Campaign Submissions
          </h2>
          <p className="text-xs text-slate-500">
            All creator submissions assigned to {campaign.name}.
          </p>
        </div>

        {/* Filters */}
        <SubmissionFilters
          filters={filters}
          onChange={setFilters}
          onReset={resetFilters}
        />

        {/* Submissions Table */}
        {submissionsError ? (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center justify-between">
            <span>Failed to load campaign submissions: {submissionsError.message}</span>
            <Button variant="secondary" size="sm" onClick={refreshSubmissions}>
              Retry
            </Button>
          </div>
        ) : (
          <SubmissionsTable
            submissions={submissions}
            totalCount={totalCount}
            page={filters.page || 1}
            pageSize={filters.pageSize || 25}
            isLoading={isSubmissionsLoading}
            onPageChange={setPage}
            onOpenSubmitModal={
              campaign.status === 'active' && permissions.canSubmitPost
                ? () => setIsSubmitModalOpen(true)
                : undefined
            }
            onRetrySubmission={() => refreshSubmissions()}
          />
        )}
      </div>

      {/* Submit Post Modal (Pre-assigned to this campaign) */}
      <Modal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        title={`Submit Post to "${campaign.name}"`}
        description="Enter an X post URL to queue background engagement fraud and bot detection analysis."
      >
        <SubmitPostForm
          initialCampaignId={campaign.id}
          onSuccess={handlePostSubmitted}
          onCancel={() => setIsSubmitModalOpen(false)}
        />
      </Modal>

      {/* Confirmation Modal (Close / Reopen) */}
      <CampaignActionConfirmModal
        isOpen={actionModalState.isOpen}
        actionType={actionModalState.actionType}
        campaign={campaign}
        isLoading={actionModalState.isLoading}
        error={actionModalState.error}
        onConfirm={handleConfirmModalAction}
        onClose={() =>
          setActionModalState({
            isOpen: false,
            actionType: null,
            isLoading: false,
            error: null,
          })
        }
      />
    </div>
  );
}
