'use client';

import { useCurrentUser } from '@/lib/auth/useCurrentUser';
import { UserSession } from '@/lib/auth/session';

export type UserRole =
  | 'platform_admin'
  | 'agency_admin'
  | 'campaign_manager'
  | 'fraud_reviewer'
  | 'viewer';

export interface PermissionsResult {
  role: string | null;
  loading: boolean;
  canViewSubmissions: boolean;
  canManageCampaigns: boolean;
  canViewAuditLog: boolean;
  canManageSettings: boolean;
  canManageApiKeys: boolean;
  canManageUsers: boolean;
  canSubmitPost: boolean;
}

/**
 * UI convenience hook for evaluating role-based visibility mirroring AAD §5.2.
 *
 * NOTE: This is a UI convenience only — the API is the real enforcement layer
 * regardless of what is rendered or hidden in the dashboard interface.
 */
export function usePermissions(customUser?: UserSession | string | null): PermissionsResult {
  const { user: hookUser, loading } = useCurrentUser();

  const user = customUser !== undefined ? customUser : hookUser;
  const role = typeof user === 'string' ? user : user?.role ?? null;

  const isPlatformAdmin = role === 'platform_admin';
  const isAgencyAdmin = role === 'agency_admin';
  const isCampaignManager = role === 'campaign_manager';
  const isFraudReviewer = role === 'fraud_reviewer';
  const isViewer = role === 'viewer';

  const canViewSubmissions = Boolean(
    role && (isPlatformAdmin || isAgencyAdmin || isCampaignManager || isFraudReviewer || isViewer)
  );

  const canManageCampaigns = Boolean(
    role && (isPlatformAdmin || isAgencyAdmin || isCampaignManager)
  );

  const canViewAuditLog = Boolean(
    role && (isPlatformAdmin || isAgencyAdmin || isFraudReviewer)
  );

  const canManageSettings = Boolean(
    role && (isPlatformAdmin || isAgencyAdmin)
  );

  const canSubmitPost = Boolean(
    role && (isPlatformAdmin || isAgencyAdmin || isCampaignManager)
  );

  return {
    role,
    loading: customUser !== undefined ? false : loading,
    canViewSubmissions,
    canManageCampaigns,
    canViewAuditLog,
    canManageSettings,
    canManageApiKeys: canManageSettings,
    canManageUsers: canManageSettings,
    canSubmitPost,
  };
}
