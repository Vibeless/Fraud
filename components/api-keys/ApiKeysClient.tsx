'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { usePermissions } from '@/lib/hooks/usePermissions';
import {
  ApiKeyListItem,
  ApiKeyListResponse,
  listApiKeys,
  revokeApiKey,
} from '@/lib/api-client/api-keys';
import { ApiClientError } from '@/lib/api-client/client';
import { Button } from '@/components/ui/Button';
import { ApiKeysTable } from './ApiKeysTable';
import { ApiKeyCreateModal } from './ApiKeyCreateModal';
import { ApiKeyRevokeModal } from './ApiKeyRevokeModal';

export interface ApiKeysClientProps {
  initialData?: ApiKeyListResponse | null;
}

export function ApiKeysClient({ initialData }: ApiKeysClientProps) {
  const permissions = usePermissions();
  const [, startTransition] = useTransition();

  const isPlatformAdmin = permissions.role === 'platform_admin';

  const [keys, setKeys] = useState<ApiKeyListItem[]>(initialData?.data || []);
  const [isLoading, setIsLoading] = useState<boolean>(!initialData);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [keyToRevoke, setKeyToRevoke] = useState<ApiKeyListItem | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await listApiKeys();
      startTransition(() => {
        setKeys(response.data);
      });
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to load API keys.');
      }
      setKeys([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch keys on mount if initialData was not provided
  useEffect(() => {
    if (!initialData && permissions.canManageApiKeys) {
      fetchKeys();
    }
  }, [fetchKeys, initialData, permissions.canManageApiKeys]);

  const handleCreateSuccess = () => {
    // Refresh keys list from backend
    fetchKeys();
  };

  const handleRevokeClick = (apiKey: ApiKeyListItem) => {
    setKeyToRevoke(apiKey);
    setRevokeError(null);
  };

  const handleConfirmRevoke = async () => {
    if (!keyToRevoke) return;

    try {
      setIsRevoking(true);
      setRevokeError(null);

      await revokeApiKey(keyToRevoke.id);

      // Re-fetch to get real backend state with revokedAt populated
      await fetchKeys();
      setKeyToRevoke(null);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setRevokeError(err.message);
      } else if (err instanceof Error) {
        setRevokeError(err.message);
      } else {
        setRevokeError('Failed to revoke API key.');
      }
    } finally {
      setIsRevoking(false);
    }
  };

  // RBAC Access Guard (AAD §5.2): Restricted to platform_admin & agency_admin
  if (!permissions.loading && !permissions.canManageApiKeys) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            API Keys
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Programmatic submission intake authentication (DUXS §4.6, AAD §3).
          </p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center max-w-2xl mx-auto shadow-xs">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-3">
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-red-900">Access Denied</h2>
          <p className="mt-1 text-sm text-red-700">
            Your role (<span className="font-mono font-medium">{permissions.role || 'unauthenticated'}</span>) is not authorized to manage API keys.
          </p>
          <p className="mt-2 text-xs text-red-500">
            Per AAD §5.2, API key creation and revocation is strictly restricted to Platform Administrators and Agency Administrators.
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
            API Keys
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Create and revoke API keys used for programmatic submission intake (DUXS §4.6).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchKeys}
            isLoading={isLoading}
            title="Refresh API keys"
          >
            <svg
              className="w-4 h-4 mr-1.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
            Refresh
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <svg
              className="w-4 h-4 mr-1.5 -ml-0.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Create API Key
          </Button>
        </div>
      </div>

      {/* Security Architecture Callout */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-start gap-2.5">
        <svg
          className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
          />
        </svg>
        <div>
          <span className="font-semibold text-slate-700">Argon2id Hash Protection (AAD §3.1):</span>{' '}
          API keys are salted and hashed with Argon2id prior to persistence. Full key secrets are revealed exactly once upon creation and cannot be retrieved subsequently.
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-3">
          <svg
            className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500"
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
          <div className="flex-1">
            <span className="font-semibold">Unable to Load API Keys:</span>
            <p className="mt-0.5">{error}</p>
          </div>
          <button
            type="button"
            onClick={fetchKeys}
            className="text-xs font-semibold text-red-800 hover:text-red-900 underline"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Table */}
      <ApiKeysTable
        keys={keys}
        isLoading={isLoading}
        onRevokeClick={handleRevokeClick}
        onCreateClick={() => setIsCreateModalOpen(true)}
      />

      {/* Create Key Modal */}
      <ApiKeyCreateModal
        isOpen={isCreateModalOpen}
        isPlatformAdmin={isPlatformAdmin}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* Revoke Key Modal */}
      <ApiKeyRevokeModal
        isOpen={Boolean(keyToRevoke)}
        apiKey={keyToRevoke}
        isLoading={isRevoking}
        error={revokeError}
        onConfirm={handleConfirmRevoke}
        onClose={() => {
          if (!isRevoking) setKeyToRevoke(null);
        }}
      />
    </div>
  );
}
