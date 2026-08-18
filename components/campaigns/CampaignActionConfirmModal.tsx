'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Campaign } from '@/lib/api-client/campaigns';

export type LifecycleActionType = 'close' | 'reopen';

export interface CampaignActionConfirmModalProps {
  isOpen: boolean;
  actionType: LifecycleActionType | null;
  campaign: Campaign | null;
  isLoading: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

export function CampaignActionConfirmModal({
  isOpen,
  actionType,
  campaign,
  isLoading,
  error,
  onConfirm,
  onClose,
}: CampaignActionConfirmModalProps) {
  if (!actionType || !campaign) return null;

  const isClose = actionType === 'close';

  const title = isClose
    ? `Close Campaign: "${campaign.name}"`
    : `Reopen Campaign: "${campaign.name}"`;

  const description = isClose
    ? 'Closing this campaign will lock submissions and automatically queue a final aggregate integrity analysis.'
    : 'Reopening this campaign will re-enable submission intake and mark existing aggregate analysis reports as stale.';

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isLoading) onClose();
      }}
      title={title}
      description={description}
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
            <div>
              <span className="font-semibold">Action Failed:</span>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        <div className={`p-4 rounded-lg border text-xs space-y-2 ${
          isClose
            ? 'bg-amber-50/70 border-amber-200 text-amber-900'
            : 'bg-blue-50/70 border-blue-200 text-blue-900'
        }`}>
          <div className="font-semibold flex items-center gap-1.5">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <span>Important System Consequences</span>
          </div>
          {isClose ? (
            <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-amber-800">
              <li>New post submissions with this campaign ID will be rejected by the API.</li>
              <li>A versioned final campaign analysis will be queued asynchronously.</li>
              <li>The campaign can be reopened later if necessary.</li>
            </ul>
          ) : (
            <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-blue-800">
              <li>New post submissions for this campaign will be accepted again.</li>
              <li>Prior aggregate analysis runs will be marked as stale (retained for audit history).</li>
              <li>You can run a new manual analysis at any time while the campaign is active.</li>
            </ul>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant={isClose ? 'primary' : 'primary'}
            size="sm"
            isLoading={isLoading}
            onClick={onConfirm}
            className={isClose ? 'bg-amber-700 hover:bg-amber-800 active:bg-amber-900 text-white' : ''}
          >
            {isClose ? 'Confirm & Close Campaign' : 'Confirm & Reopen Campaign'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
