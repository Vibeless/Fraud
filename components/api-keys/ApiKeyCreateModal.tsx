'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import {
  ApiKeyCreatedResponse,
  ApiKeyScope,
  API_KEY_SCOPES,
  createApiKey,
} from '@/lib/api-client/api-keys';
import { ApiClientError } from '@/lib/api-client/client';
import { SCOPES_METADATA } from './ApiKeyScopes';

export interface ApiKeyCreateModalProps {
  isOpen: boolean;
  isPlatformAdmin: boolean;
  onClose: () => void;
  onSuccess: (created: ApiKeyCreatedResponse) => void;
}

export function ApiKeyCreateModal({
  isOpen,
  isPlatformAdmin,
  onClose,
  onSuccess,
}: ApiKeyCreateModalProps) {
  // Form State
  const [name, setName] = useState('');
  const [agencyId, setAgencyId] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<ApiKeyScope[]>([
    'submissions:write',
    'submissions:read',
    'analyses:read',
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // One-time secret reveal state — strictly ephemeral in React component state
  const [createdResult, setCreatedResult] = useState<ApiKeyCreatedResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const resetForm = () => {
    setName('');
    setAgencyId('');
    setSelectedScopes([
      'submissions:write',
      'submissions:read',
      'analyses:read',
    ]);
    setError(null);
    setCreatedResult(null);
    setCopied(false);
  };

  const handleClose = () => {
    if (isSubmitting) return;

    if (createdResult) {
      // Completed creation flow
      const finishedResult = createdResult;
      resetForm();
      onSuccess(finishedResult);
      onClose();
    } else {
      resetForm();
      onClose();
    }
  };

  const handleToggleScope = (scope: ApiKeyScope) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  const handleSelectAllScopes = () => {
    setSelectedScopes([...API_KEY_SCOPES]);
  };

  const handleClearScopes = () => {
    setSelectedScopes([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Key name is required.');
      return;
    }

    if (selectedScopes.length === 0) {
      setError('You must select at least one permission scope.');
      return;
    }

    if (isPlatformAdmin && !agencyId.trim()) {
      setError('Agency ID is required for platform administrators.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const response = await createApiKey({
        name: trimmedName,
        scopes: selectedScopes,
        agencyId: isPlatformAdmin && agencyId.trim() ? agencyId.trim() : undefined,
      });

      // Populate ephemeral secret state for the one-time reveal step
      setCreatedResult(response);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred while creating the API key.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopySecret = async () => {
    if (!createdResult?.key) return;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(createdResult.key);
      } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = createdResult.key;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy secret to clipboard', err);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={createdResult ? 'API Key Generated' : 'Create API Key'}
      description={
        createdResult
          ? 'Your new API key has been created. Copy the full secret now — it will never be displayed again.'
          : 'Generate a new API key for programmatic submission intake and analysis queries (OAS §9).'
      }
      maxWidthClass={createdResult ? 'max-w-xl' : 'max-w-lg'}
    >
      {createdResult ? (
        /* Step 2: One-Time Secret Reveal View (DUXS §4.6, AAD §3.1) */
        <div className="space-y-5">
          {/* Critical Security Warning */}
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-300/80 text-amber-950 flex items-start gap-3 shadow-xs">
            <svg
              className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
            <div className="space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wide text-amber-900">
                You will not see this key again!
              </h4>
              <p className="text-xs text-amber-800 leading-relaxed">
                Copy and store this secret in a secure credentials manager immediately. Per the
                system’s cryptographic design, only an Argon2id hash is stored on the server.
                The full secret cannot be retrieved or recovered after closing this window.
              </p>
            </div>
          </div>

          {/* Secret Display & Copy Box */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              API Key Secret
            </label>
            <div className="relative rounded-lg border border-slate-300 bg-slate-950 p-3 text-slate-100 flex items-center justify-between gap-3 shadow-inner">
              <code className="text-xs sm:text-sm font-mono tracking-tight text-emerald-400 break-all select-all font-semibold">
                {createdResult.key}
              </code>
              <button
                type="button"
                onClick={handleCopySecret}
                className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all shadow-xs ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700'
                }`}
                title="Copy full key secret"
              >
                {copied ? (
                  <>
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="2.5"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m4.5 12.75 6 6 9-13.5"
                      />
                    </svg>
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184"
                      />
                    </svg>
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Key Details Summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-2">
            <div className="flex justify-between items-center text-slate-600">
              <span className="font-medium">Key Prefix:</span>
              <span className="font-mono text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                {createdResult.keyPrefix}…
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span className="font-medium">Key Name:</span>
              <span className="font-medium text-slate-900">{name}</span>
            </div>
            <div>
              <span className="font-medium text-slate-600 block mb-1">Granted Scopes:</span>
              <div className="flex flex-wrap gap-1.5">
                {selectedScopes.map((scope) => (
                  <span
                    key={scope}
                    className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-200 text-slate-800"
                  >
                    {scope}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleClose}
              className="bg-slate-900 hover:bg-slate-800 text-white"
            >
              Done — I Have Stored My Key
            </Button>
          </div>
        </div>
      ) : (
        /* Step 1: Configuration Form */
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <svg
                className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Key Name */}
          <div>
            <label htmlFor="api-key-name" className="block text-xs font-semibold text-slate-700 mb-1">
              Key Name <span className="text-red-500">*</span>
            </label>
            <input
              id="api-key-name"
              type="text"
              required
              maxLength={100}
              placeholder="e.g. Production Webhook Submitter"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:bg-slate-50 disabled:text-slate-500"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Descriptive label identifying the integration or service utilizing this key.
            </p>
          </div>

          {/* Platform Admin: Target Agency ID Field */}
          {isPlatformAdmin && (
            <div>
              <label
                htmlFor="api-key-agency-id"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Target Agency ID <span className="text-red-500">*</span>
              </label>
              <input
                id="api-key-agency-id"
                type="text"
                required
                placeholder="e.g. 00000000-0000-0000-0000-000000000001"
                value={agencyId}
                onChange={(e) => setAgencyId(e.target.value)}
                disabled={isSubmitting}
                className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:bg-slate-50 disabled:text-slate-500"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                As a platform admin, specify the agency UUID to which this API key belongs.
              </p>
            </div>
          )}

          {/* Scope Checkboxes (AAD §3.2) */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700">
                Permissions & Scopes <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={handleSelectAllScopes}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline"
                >
                  Select All
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={handleClearScopes}
                  className="text-xs text-slate-500 hover:text-slate-700 font-medium hover:underline"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 bg-slate-50/50 max-h-60 overflow-y-auto">
              {API_KEY_SCOPES.map((scope) => {
                const meta = SCOPES_METADATA[scope];
                const isChecked = selectedScopes.includes(scope);

                return (
                  <label
                    key={scope}
                    className="flex items-start gap-3 p-2.5 cursor-pointer hover:bg-slate-100/70 transition-colors"
                  >
                    <input
                      type="checkbox"
                      value={scope}
                      checked={isChecked}
                      onChange={() => handleToggleScope(scope)}
                      disabled={isSubmitting}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                    />
                    <div className="text-xs">
                      <span className="font-mono font-semibold text-slate-900">{meta.label}</span>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        {meta.description}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
            {selectedScopes.length === 0 && (
              <p className="text-[11px] text-amber-600 font-medium">
                At least one scope must be selected to generate a functional API key.
              </p>
            )}
          </div>

          {/* Form Actions */}
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
              disabled={isSubmitting || selectedScopes.length === 0}
            >
              Generate Key
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
