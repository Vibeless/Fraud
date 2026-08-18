'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { createSubmission, Submission } from '@/lib/api-client/submissions';
import { ApiClientError } from '@/lib/api-client';

export interface SubmitPostFormProps {
  initialCampaignId?: string;
  onSuccess?: (submission: Submission) => void;
  onCancel?: () => void;
}

export function SubmitPostForm({ initialCampaignId = '', onSuccess, onCancel }: SubmitPostFormProps) {
  const permissions = usePermissions();
  const [postUrl, setPostUrl] = useState('');
  const [campaignId, setCampaignId] = useState(initialCampaignId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [createdSubmission, setCreatedSubmission] = useState<Submission | null>(null);

  // Role check: Only campaign_manager, agency_admin, platform_admin permitted per AAD §5.2
  if (!permissions.loading && !permissions.canSubmitPost) {
    return (
      <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
        <p className="font-semibold">Access Restricted</p>
        <p className="mt-1">
          Your role ({permissions.role || 'viewer'}) does not have permission to submit posts for analysis.
        </p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setErrorCode(null);

    const trimmedUrl = postUrl.trim();
    if (!trimmedUrl) {
      setErrorMessage('Post URL is required.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createSubmission({
        postUrl: trimmedUrl,
        campaignId: campaignId.trim() || undefined,
      });

      setCreatedSubmission(result);
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setErrorCode(err.code);
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('An unexpected error occurred while submitting the post.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setPostUrl('');
    setCampaignId('');
    setCreatedSubmission(null);
    setErrorMessage(null);
    setErrorCode(null);
  };

  // Success view when post is queued
  if (createdSubmission) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <div className="flex-1 text-sm">
              <h4 className="font-semibold text-emerald-900">Post Submitted Successfully</h4>
              <p className="text-emerald-700 mt-1">
                The post has been placed in the analysis queue. Background detection analyzers are processing the engagement signals.
              </p>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-emerald-800 bg-emerald-100/60 p-2.5 rounded-md font-mono">
                <div>
                  <span className="font-medium text-emerald-950">Status: </span>
                  <span className="font-bold uppercase tracking-wider">{createdSubmission.status}</span>
                </div>
                <div>
                  <span className="font-medium text-emerald-950">ID: </span>
                  <span className="truncate">{createdSubmission.id.slice(0, 12)}…</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={handleReset} type="button">
            Submit Another Post
          </Button>
          {onCancel && (
            <Button variant="primary" onClick={onCancel} type="button">
              Done
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {errorMessage && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 p-4 border border-red-200 text-sm text-red-700 flex items-start gap-3"
        >
          <svg
            className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
              clipRule="evenodd"
            />
          </svg>
          <div className="flex-1">
            {errorCode && (
              <span className="font-mono text-xs font-bold text-red-800 uppercase block mb-0.5">
                [{errorCode}]
              </span>
            )}
            <p>{errorMessage}</p>
          </div>
        </div>
      )}

      <div>
        <label htmlFor="postUrl" className="block text-sm font-medium text-slate-700">
          X Post URL <span className="text-red-500">*</span>
        </label>
        <div className="mt-1">
          <input
            id="postUrl"
            name="postUrl"
            type="url"
            required
            placeholder="https://x.com/creator/status/1234567890123456789"
            value={postUrl}
            onChange={(e) => setPostUrl(e.target.value)}
            disabled={isSubmitting}
            className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:bg-slate-50"
          />
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Must be a valid status URL from x.com or twitter.com.
        </p>
      </div>

      <div>
        <label htmlFor="campaignId" className="block text-sm font-medium text-slate-700">
          Campaign ID <span className="text-xs text-slate-400">(Optional)</span>
        </label>
        <div className="mt-1">
          <input
            id="campaignId"
            name="campaignId"
            type="text"
            placeholder="e.g. 3fa85f64-5717-4562-b3fc-2c963f66afa6"
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
            disabled={isSubmitting}
            className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:bg-slate-50 font-mono text-xs"
          />
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Associate this post submission with a specific campaign reference.
        </p>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
        {onCancel && (
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          isLoading={isSubmitting}
          disabled={isSubmitting}
        >
          Submit Post for Analysis
        </Button>
      </div>
    </form>
  );
}
