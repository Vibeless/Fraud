'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Campaign, createCampaign } from '@/lib/api-client/campaigns';
import { ApiClientError } from '@/lib/api-client/client';

export interface CampaignCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (campaign: Campaign) => void;
}

export function CampaignCreateModal({
  isOpen,
  onClose,
  onSuccess,
}: CampaignCreateModalProps) {
  const [name, setName] = useState('');
  const [externalCampaignId, setExternalCampaignId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setExternalCampaignId('');
    setError(null);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Campaign name is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const campaign = await createCampaign({
        name: name.trim(),
        externalCampaignId: externalCampaignId.trim() ? externalCampaignId.trim() : null,
      });

      resetForm();
      onSuccess(campaign);
      onClose();
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred while creating the campaign.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Campaign"
      description="Define a new campaign reference to group and evaluate creator submissions."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Campaign Name Field */}
        <div>
          <label htmlFor="campaign-name" className="block text-xs font-semibold text-slate-700 mb-1">
            Campaign Name <span className="text-red-500">*</span>
          </label>
          <input
            id="campaign-name"
            type="text"
            required
            placeholder="e.g. Summer Brand Awareness 2026"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSubmitting}
            className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:bg-slate-50 disabled:text-slate-500"
          />
        </div>

        {/* External Campaign ID Field (Optional) */}
        <div>
          <label htmlFor="campaign-external-id" className="block text-xs font-semibold text-slate-700 mb-1">
            External Campaign ID <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            id="campaign-external-id"
            type="text"
            placeholder="e.g. sba-2026-q3"
            value={externalCampaignId}
            onChange={(e) => setExternalCampaignId(e.target.value)}
            disabled={isSubmitting}
            className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:bg-slate-50 disabled:text-slate-500"
          />
          <p className="mt-1 text-[11px] text-slate-500">
            External identifier from your CRM, influencer platform, or tracking system.
          </p>
        </div>

        {/* Status Notice (Lifecycle clarity) */}
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
          <svg className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
          </svg>
          <div>
            <span className="font-medium text-slate-800">Initial Status: Draft</span>
            <p className="mt-0.5 text-slate-500 text-[11px]">
              All new campaigns start in <span className="font-medium text-slate-700">draft</span> status. Once setup is verified, you can activate the campaign to start accepting submissions.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
          >
            Create Campaign
          </Button>
        </div>
      </form>
    </Modal>
  );
}
