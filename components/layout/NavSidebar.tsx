'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePermissions } from '@/lib/hooks/usePermissions';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

// Icons for navigation items
function QueueIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
    </svg>
  );
}

function CampaignsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75 2.25 12l4.179 2.25m0-4.5 5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0 4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0-5.571 3-5.571-3" />
    </svg>
  );
}

function AuditLogIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
    </svg>
  );
}

function ApiKeysIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  );
}

/**
 * Left navigation sidebar according to DUXS §3 (Information Architecture).
 *
 * NOTE: Nav link visibility is a UI convenience only — the API is the real
 * enforcement layer regardless of what is rendered here (AAD §5.2).
 */
export function NavSidebar() {
  const pathname = usePathname();
  const permissions = usePermissions();

  const isLinkActive = (href: string, exact = false) => {
    if (exact) {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <aside
      className="w-64 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col h-full select-none"
      aria-label="Dashboard Sidebar"
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-200 gap-3">
        <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0">
          CI
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold text-slate-900 truncate">
            Campaign Integrity
          </span>
          <span className="text-xs text-slate-500 truncate">
            Review Dashboard
          </span>
        </div>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {/* Main Section */}
        <div>
          <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Overview
          </div>
          <nav className="space-y-1" aria-label="Main Navigation">
            {/* Submissions Queue — visible to all authenticated roles */}
            {permissions.canViewSubmissions && (
              <Link
                href="/submissions"
                className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isLinkActive('/submissions')
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <QueueIcon
                  className={`h-5 w-5 flex-shrink-0 ${
                    isLinkActive('/submissions') ? 'text-white' : 'text-slate-500'
                  }`}
                />
                <span className="truncate">Submissions Queue</span>
              </Link>
            )}

            {/* Campaigns — visible to agency_admin, campaign_manager, platform_admin */}
            {permissions.canManageCampaigns && (
              <Link
                href="/campaigns"
                className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isLinkActive('/campaigns')
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <CampaignsIcon
                  className={`h-5 w-5 flex-shrink-0 ${
                    isLinkActive('/campaigns') ? 'text-white' : 'text-slate-500'
                  }`}
                />
                <span className="truncate">Campaigns</span>
              </Link>
            )}

            {/* Audit Log — visible to agency_admin, fraud_reviewer, platform_admin */}
            {permissions.canViewAuditLog && (
              <Link
                href="/audit-log"
                className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isLinkActive('/audit-log')
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <AuditLogIcon
                  className={`h-5 w-5 flex-shrink-0 ${
                    isLinkActive('/audit-log') ? 'text-white' : 'text-slate-500'
                  }`}
                />
                <span className="truncate">Audit Log</span>
              </Link>
            )}
          </nav>
        </div>

        {/* Settings Section — visible to agency_admin & platform_admin */}
        {permissions.canManageSettings && (
          <div>
            <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Settings
            </div>
            <nav className="space-y-1" aria-label="Settings Navigation">
              {permissions.canManageApiKeys && (
                <Link
                  href="/settings/api-keys"
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isLinkActive('/settings/api-keys')
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <ApiKeysIcon
                    className={`h-5 w-5 flex-shrink-0 ${
                      isLinkActive('/settings/api-keys') ? 'text-white' : 'text-slate-500'
                    }`}
                  />
                  <span className="truncate">API Keys</span>
                </Link>
              )}

              {permissions.canManageUsers && (
                <Link
                  href="/settings/users"
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isLinkActive('/settings/users')
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <UsersIcon
                    className={`h-5 w-5 flex-shrink-0 ${
                      isLinkActive('/settings/users') ? 'text-white' : 'text-slate-500'
                    }`}
                  />
                  <span className="truncate">Users & Roles</span>
                </Link>
              )}
            </nav>
          </div>
        )}
      </div>

      {/* Sidebar Footer info */}
      <div className="p-4 border-t border-slate-200">
        <div className="text-xs text-slate-400">
          Campaign Integrity v1.0
        </div>
      </div>
    </aside>
  );
}
