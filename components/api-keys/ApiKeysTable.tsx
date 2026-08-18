'use client';

import React from 'react';
import { ApiKeyListItem } from '@/lib/api-client/api-keys';
import { Button } from '@/components/ui/Button';

export interface ApiKeysTableProps {
  keys: ApiKeyListItem[];
  isLoading?: boolean;
  onRevokeClick: (apiKey: ApiKeyListItem) => void;
  onCreateClick: () => void;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Never used';
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
    return String(dateStr);
  }
}

export function ApiKeysTable({
  keys,
  isLoading,
  onRevokeClick,
  onCreateClick,
}: ApiKeysTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="p-8 text-center space-y-3">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-slate-800" />
          <p className="text-sm text-slate-500">Loading API keys...</p>
        </div>
      </div>
    );
  }

  if (keys.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-xs">
        <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z"
            />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-slate-900">No API Keys Configured</h3>
        <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
          Generate your first API key to enable programmatic submission intake and automated risk
          scoring from your influencer management platforms (AAD §3.1).
        </p>
        <div className="mt-6">
          <Button type="button" variant="primary" size="sm" onClick={onCreateClick}>
            <svg
              className="w-4 h-4 mr-1.5 -ml-0.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Generate API Key
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600 border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <th scope="col" className="py-3.5 pl-6 pr-3">
                Key Name & Status
              </th>
              <th scope="col" className="px-3 py-3.5">
                Key Prefix
              </th>
              <th scope="col" className="px-3 py-3.5">
                Granted Scopes
              </th>
              <th scope="col" className="px-3 py-3.5">
                Last Used
              </th>
              <th scope="col" className="px-3 py-3.5">
                Created
              </th>
              <th scope="col" className="py-3.5 pl-3 pr-6 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/80 bg-white">
            {keys.map((key) => {
              const isRevoked = Boolean(key.revokedAt);

              return (
                <tr
                  key={key.id}
                  className={`transition-colors ${
                    isRevoked
                      ? 'bg-slate-50/60 opacity-60 hover:bg-slate-50/80'
                      : 'hover:bg-slate-50/80'
                  }`}
                >
                  {/* Name & Status */}
                  <td className="py-4 pl-6 pr-3 align-top">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-semibold ${
                          isRevoked ? 'text-slate-500 line-through' : 'text-slate-900'
                        }`}
                      >
                        {key.name}
                      </span>
                      {isRevoked ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          Revoked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      )}
                    </div>
                    {isRevoked && key.revokedAt && (
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Revoked: {formatDate(key.revokedAt)}
                      </p>
                    )}
                  </td>

                  {/* Prefix */}
                  <td className="px-3 py-4 align-top">
                    <span className="inline-flex items-center font-mono text-xs px-2 py-1 rounded bg-slate-100 border border-slate-200 text-slate-800 font-medium">
                      {key.keyPrefix}…
                    </span>
                  </td>

                  {/* Scopes */}
                  <td className="px-3 py-4 align-top max-w-xs">
                    <div className="flex flex-wrap gap-1.5">
                      {Array.isArray(key.scopes) && key.scopes.length > 0 ? (
                        key.scopes.map((scope) => (
                          <span
                            key={scope}
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200"
                          >
                            {scope}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400">None</span>
                      )}
                    </div>
                  </td>

                  {/* Last Used */}
                  <td className="px-3 py-4 align-top text-xs whitespace-nowrap">
                    {key.lastUsedAt ? (
                      <span className="text-slate-700 font-medium">
                        {formatDate(key.lastUsedAt)}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Never used</span>
                    )}
                  </td>

                  {/* Created */}
                  <td className="px-3 py-4 align-top text-xs text-slate-600 whitespace-nowrap">
                    {formatDate(key.createdAt)}
                  </td>

                  {/* Actions */}
                  <td className="py-4 pl-3 pr-6 align-top text-right whitespace-nowrap">
                    {isRevoked ? (
                      <span className="text-xs text-slate-400 italic">No actions</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onRevokeClick(key)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 active:bg-red-100 rounded-lg border border-red-200 hover:border-red-300 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-1"
                        aria-label={`Revoke API key ${key.name}`}
                      >
                        <svg
                          className="w-3.5 h-3.5"
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
                        <span>Revoke</span>
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
