'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ApiKeyListItem } from '@/lib/api-client/api-keys';

export interface ApiKeyRevokeModalProps {
  isOpen: boolean;
  apiKey: ApiKeyListItem | null;
  isLoading: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

export function ApiKeyRevokeModal({
  isOpen,
  apiKey,
  isLoading,
  error,
  onConfirm,
  onClose,
}: ApiKeyRevokeModalProps) {
  if (!apiKey) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isLoading) onClose();
      }}
      title={`Revoke API Key: "${apiKey.name}"`}
      description="Revoking an API key is immediate and irreversible (OAS §9, AAD §3.4)."
      maxWidthClass="max-w-lg"
    >
      <div className="space-y-4">
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
            <div>
              <span className="font-semibold">Revocation Failed:</span>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Destructive Warning Box */}
        <div className="p-4 rounded-lg border bg-red-50/70 border-red-200 text-xs text-red-950 space-y-2">
          <div className="font-semibold flex items-center gap-1.5 text-red-900">
            <svg
              className="w-4 h-4 flex-shrink-0 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
            <span>Permanent System Deactivation</span>
          </div>
          <p className="text-[11px] text-red-800 leading-relaxed">
            Are you sure you want to revoke API key{' '}
            <span className="font-semibold text-red-900">"{apiKey.name}"</span> (Prefix:{' '}
            <span className="font-mono bg-red-100 px-1 py-0.5 rounded text-red-900 font-semibold">
              {apiKey.keyPrefix}…
            </span>
            )?
          </p>
          <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-red-700">
            <li>Any automated scripts, pipelines, or integrations using this key will immediately be rejected with HTTP 401 Unauthorized.</li>
            <li>This action cannot be undone. You will need to generate a new key to restore integration access.</li>
            <li>The key metadata is retained as an immutable revoked record for audit trails (AAD §3.4).</li>
          </ul>
        </div>

        {/* Modal Actions */}
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
            variant="primary"
            size="sm"
            isLoading={isLoading}
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white"
          >
            Revoke Key Immediately
          </Button>
        </div>
      </div>
    </Modal>
  );
}
