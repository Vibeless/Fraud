'use client';

import React, { useState, useCallback, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import {
  Campaign,
  PaginatedCampaignsResponse,
  ListCampaignsParams,
  listCampaigns,
  activateCampaign,
  closeCampaign,
  reopenCampaign,
  analyzeCampaign,
} from '@/lib/api-client/campaigns';
import { ApiClientError } from '@/lib/api-client/client';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { CampaignsTable } from '@/components/campaigns/CampaignsTable';
import { CampaignFilters } from '@/components/campaigns/CampaignFilters';
import { CampaignCreateModal } from '@/components/campaigns/CampaignCreateModal';
import {
  CampaignActionConfirmModal,
  LifecycleActionType,
} from '@/components/campaigns/CampaignActionConfirmModal';

export interface CampaignsListClientProps {
  initialData?: PaginatedCampaignsResponse | null;
}

export function CampaignsListClient({ initialData }: CampaignsListClientProps) {
  const permissions = usePermissions();
  const [, startTransition] = useTransition();

  const [campaigns, setCampaigns] = useState<Campaign[]>(initialData?.data || []);
  const [totalCount, setTotalCount] = useState<number>(initialData?.pagination.total || 0);
  const [filters, setFilters] = useState<ListCampaignsParams & { search?: string }>({
    page: 1,
    pageSize: 25,
  });
  const [isLoading, setIsLoading] = useState<boolean>(!initialData);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Modal & action state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [actionModalState, setActionModalState] = useState<{
    isOpen: boolean;
    actionType: LifecycleActionType | null;
    campaign: Campaign | null;
    isLoading: boolean;
    error: string | null;
  }>({
    isOpen: false,
    actionType: null,
    campaign: null,
    isLoading: false,
    error: null,
  });

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Fetch campaigns
  const fetchCampaignData = useCallback(async (currentFilters: ListCampaignsParams & { search?: string }) => {
    try {
      setIsLoading(true);
      setFetchError(null);

      const res = await listCampaigns({
        status: currentFilters.status,
        agencyId: currentFilters.agencyId,
        page: currentFilters.page,
        pageSize: currentFilters.pageSize,
      });

      let items = res.data;
      // Client-side search filtering by name or externalCampaignId
      if (currentFilters.search) {
        const query = currentFilters.search.toLowerCase();
        items = items.filter(
          (c) =>
            c.name.toLowerCase().includes(query) ||
            (c.externalCampaignId && c.externalCampaignId.toLowerCase().includes(query)) ||
            c.id.toLowerCase().includes(query)
        );
      }

      setCampaigns(items);
      setTotalCount(currentFilters.search ? items.length : res.pagination.total);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setFetchError(err.message);
      } else if (err instanceof Error) {
        setFetchError(err.message);
      } else {
        setFetchError('Failed to load campaigns.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialData) {
      fetchCampaignData(filters);
    }
  }, [filters, fetchCampaignData, initialData]);

  const handlePageChange = (newPage: number) => {
    const nextFilters = { ...filters, page: newPage };
    setFilters(nextFilters);
    fetchCampaignData(nextFilters);
  };

  const handleFiltersChange = (newFilters: ListCampaignsParams & { search?: string }) => {
    setFilters(newFilters);
    fetchCampaignData(newFilters);
  };

  const handleResetFilters = () => {
    const nextFilters = { page: 1, pageSize: 25 };
    setFilters(nextFilters);
    fetchCampaignData(nextFilters);
  };

  const handleCampaignCreated = (newCampaign: Campaign) => {
    setNotification({
      type: 'success',
      message: `Campaign "${newCampaign.name}" created successfully in draft status.`,
    });
    fetchCampaignData(filters);
  };

  // Direct Lifecycle Action: Activate (draft -> active)
  const handleActivate = async (campaign: Campaign) => {
    try {
      setActionLoadingId(campaign.id);
      setNotification(null);

      const updated = await activateCampaign(campaign.id);

      startTransition(() => {
        setCampaigns((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c))
        );
      });

      setNotification({
        type: 'success',
        message: `Campaign "${updated.name}" has been activated. Submissions are now accepted.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to activate campaign.';
      setNotification({
        type: 'error',
        message: `Could not activate "${campaign.name}": ${msg}`,
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Direct Lifecycle Action: Analyze (manual trigger on active campaign)
  const handleAnalyze = async (campaign: Campaign) => {
    try {
      setActionLoadingId(campaign.id);
      setNotification(null);

      const result = await analyzeCampaign(campaign.id);

      setNotification({
        type: 'success',
        message: `Manual analysis v${result.version} queued for "${campaign.name}" (Status: ${result.status}).`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to trigger campaign analysis.';
      setNotification({
        type: 'error',
        message: `Could not trigger analysis for "${campaign.name}": ${msg}`,
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Open Confirmation Modal for Close
  const handleTriggerCloseModal = (campaign: Campaign) => {
    setActionModalState({
      isOpen: true,
      actionType: 'close',
      campaign,
      isLoading: false,
      error: null,
    });
  };

  // Open Confirmation Modal for Reopen
  const handleTriggerReopenModal = (campaign: Campaign) => {
    setActionModalState({
      isOpen: true,
      actionType: 'reopen',
      campaign,
      isLoading: false,
      error: null,
    });
  };

  // Execute Confirmed Modal Action (Close or Reopen)
  const handleConfirmModalAction = async () => {
    const { actionType, campaign } = actionModalState;
    if (!actionType || !campaign) return;

    try {
      setActionModalState((prev) => ({ ...prev, isLoading: true, error: null }));

      let updated: Campaign;
      if (actionType === 'close') {
        updated = await closeCampaign(campaign.id);
      } else {
        updated = await reopenCampaign(campaign.id);
      }

      startTransition(() => {
        setCampaigns((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c))
        );
      });

      setActionModalState({
        isOpen: false,
        actionType: null,
        campaign: null,
        isLoading: false,
        error: null,
      });

      setNotification({
        type: 'success',
        message: actionType === 'close'
          ? `Campaign "${updated.name}" has been closed. Final analysis queued.`
          : `Campaign "${updated.name}" has been reopened. New submissions are now accepted.`,
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Campaigns
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage campaign lifecycles, coordinate submission grouping, and evaluate aggregate integrity.
          </p>
        </div>

        {/* Create Campaign Button (RBAC: Only platform_admin, agency_admin, campaign_manager) */}
        {permissions.canManageCampaigns && (
          <Button
            variant="primary"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex-shrink-0"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Create Campaign
          </Button>
        )}
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

      {/* Fetch Error Banner */}
      {fetchError && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center justify-between">
          <span>Failed to load campaigns: {fetchError}</span>
          <Button variant="secondary" size="sm" onClick={() => fetchCampaignData(filters)}>
            Retry
          </Button>
        </div>
      )}

      {/* Filters Bar */}
      <CampaignFilters
        filters={filters}
        onChange={handleFiltersChange}
        onReset={handleResetFilters}
      />

      {/* Campaigns Table */}
      <CampaignsTable
        campaigns={campaigns}
        totalCount={totalCount}
        page={filters.page || 1}
        pageSize={filters.pageSize || 25}
        isLoading={isLoading}
        canManageCampaigns={permissions.canManageCampaigns}
        actionLoadingId={actionLoadingId}
        onPageChange={handlePageChange}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        onActivateCampaign={handleActivate}
        onTriggerCloseModal={handleTriggerCloseModal}
        onTriggerReopenModal={handleTriggerReopenModal}
        onAnalyzeCampaign={handleAnalyze}
      />

      {/* Create Campaign Modal */}
      <CampaignCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCampaignCreated}
      />

      {/* Action Confirmation Modal (Close / Reopen) */}
      <CampaignActionConfirmModal
        isOpen={actionModalState.isOpen}
        actionType={actionModalState.actionType}
        campaign={actionModalState.campaign}
        isLoading={actionModalState.isLoading}
        error={actionModalState.error}
        onConfirm={handleConfirmModalAction}
        onClose={() =>
          setActionModalState({
            isOpen: false,
            actionType: null,
            campaign: null,
            isLoading: false,
            error: null,
          })
        }
      />
    </div>
  );
}
