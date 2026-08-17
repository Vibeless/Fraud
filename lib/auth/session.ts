'use server';

import { cookies } from 'next/headers';
import { apiClient, ApiClientError } from '@/lib/api-client';

export interface UserSession {
  id: string;
  email: string;
  role: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: UserSession;
}

export interface RefreshResponse {
  accessToken: string;
  expiresIn: number;
}

export interface UserMeResponse {
  id: string;
  email?: string;
  role: string;
  agencyId?: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResult {
  success: boolean;
  user?: UserSession;
  error?: string;
}

export interface LogoutResult {
  success: boolean;
  error?: string;
}

/**
 * Exchanges email + password for a dashboard session per docs/specs/02_API_Specification_OAS.md §8
 * and stores session tokens in httpOnly cookies per docs/specs/04_Authentication_Authorization_Design_AAD.md §4.1.
 */
export async function login(credentials: LoginCredentials): Promise<LoginResult> {
  try {
    const data = await apiClient<LoginResponse>('auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    const cookieStore = await cookies();
    const isProduction = process.env.NODE_ENV === 'production';

    // Store accessToken in httpOnly cookie
    cookieStore.set('ci_access_token', data.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: data.expiresIn,
    });

    // Store refreshToken in httpOnly cookie (30-day TTL per AAD §4.1)
    cookieStore.set('ci_refresh_token', data.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    return {
      success: true,
      user: data.user,
    };
  } catch (error: unknown) {
    if (error instanceof ApiClientError) {
      return {
        success: false,
        error: error.message,
      };
    }

    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'An unexpected error occurred.',
    };
  }
}

/**
 * Retrieves the currently authenticated user's session by calling GET /v1/auth/me per OAS §8.
 * Automatically refreshes the session via POST /v1/auth/refresh if the access token has expired.
 */
export async function getCurrentUser(): Promise<UserSession | null> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('ci_access_token')?.value;
    const refreshToken = cookieStore.get('ci_refresh_token')?.value;

    if (!accessToken && !refreshToken) {
      return null;
    }

    const isProduction = process.env.NODE_ENV === 'production';

    if (accessToken) {
      try {
        const user = await apiClient<UserMeResponse>('auth/me', {
          method: 'GET',
          token: accessToken,
        });

        return {
          id: user.id,
          email: user.email || '',
          role: user.role,
        };
      } catch (err) {
        // If 401 and refreshToken exists, fall through to refresh
        if (!(err instanceof ApiClientError && err.statusCode === 401) || !refreshToken) {
          return null;
        }
      }
    }

    if (refreshToken) {
      try {
        const refreshData = await apiClient<RefreshResponse>('auth/refresh', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        });

        cookieStore.set('ci_access_token', refreshData.accessToken, {
          httpOnly: true,
          secure: isProduction,
          sameSite: 'lax',
          path: '/',
          maxAge: refreshData.expiresIn,
        });

        const user = await apiClient<UserMeResponse>('auth/me', {
          method: 'GET',
          token: refreshData.accessToken,
        });

        return {
          id: user.id,
          email: user.email || '',
          role: user.role,
        };
      } catch {
        cookieStore.delete('ci_access_token');
        cookieStore.delete('ci_refresh_token');
        return null;
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Logs out the current session by calling POST /v1/auth/logout and clearing httpOnly cookies.
 */
export async function logout(): Promise<LogoutResult> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('ci_access_token')?.value;

    if (accessToken) {
      try {
        await apiClient('auth/logout', {
          method: 'POST',
          token: accessToken,
        });
      } catch {
        // Ignore API logout error and proceed to clear cookies
      }
    }

    cookieStore.delete('ci_access_token');
    cookieStore.delete('ci_refresh_token');

    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred during logout.',
    };
  }
}
