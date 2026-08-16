'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/lib/auth/useCurrentUser';
import { logout } from '@/lib/auth/session';

function formatRoleName(role?: string | null): string {
  if (!role) return 'User';
  switch (role) {
    case 'platform_admin':
      return 'Platform Admin';
    case 'agency_admin':
      return 'Agency Admin';
    case 'campaign_manager':
      return 'Campaign Manager';
    case 'fraud_reviewer':
      return 'Fraud Reviewer';
    case 'viewer':
      return 'Viewer';
    default:
      return role
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
  }
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
    </svg>
  );
}

export function TopBar() {
  const router = useRouter();
  const { user, loading } = useCurrentUser();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      await logout();
      router.push('/login');
    } catch {
      // Always attempt redirect to login even if error occurs
      router.push('/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : 'U';

  return (
    <header
      className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between flex-shrink-0"
      role="banner"
    >
      {/* Left side spacer or context header */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-slate-500">
          Agency Workspace
        </span>
      </div>

      {/* Right side: User Profile & Logout Button */}
      <div className="flex items-center gap-4">
        {loading ? (
          <div className="flex items-center gap-3 animate-pulse">
            <div className="h-8 w-8 rounded-full bg-slate-200" />
            <div className="h-4 w-28 bg-slate-200 rounded" />
          </div>
        ) : (
          <div className="flex items-center gap-3">
            {/* User Avatar / Initial */}
            <div
              className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-semibold text-slate-700 select-none"
              title={user?.email || 'User'}
            >
              {userInitial}
            </div>

            {/* Email & Role Badge */}
            <div className="flex flex-col text-left">
              <span className="text-sm font-medium text-slate-800 leading-tight max-w-[200px] truncate">
                {user?.email || 'Authenticated User'}
              </span>
              <div className="mt-0.5">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                  {formatRoleName(user?.role)}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="h-5 w-px bg-slate-200 mx-1" aria-hidden="true" />

        {/* Logout Button */}
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Sign out of your account"
        >
          {isLoggingOut ? (
            <>
              <svg className="animate-spin h-3.5 w-3.5 text-slate-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Signing out…</span>
            </>
          ) : (
            <>
              <LogoutIcon className="h-3.5 w-3.5 text-slate-500" />
              <span>Log out</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
