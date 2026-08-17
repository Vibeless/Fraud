'use client';

import { useState, useEffect, useCallback } from 'react';
import { getCurrentUser, UserSession } from '@/lib/auth/session';

export interface UseCurrentUserResult {
  user: UserSession | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to retrieve and subscribe to the currently logged in user session.
 * Fetches user profile via getCurrentUser() on mount and exposes a refresh method.
 */
export function useCurrentUser(): UseCurrentUserResult {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const sessionUser = await getCurrentUser();
      setUser(sessionUser);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch current user'));
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return {
    user,
    loading,
    error,
    refresh: fetchUser,
  };
}
